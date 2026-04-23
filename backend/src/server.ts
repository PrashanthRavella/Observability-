import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { parseIntentToStory } from './engine/intentParser.js';
import { generateInsight, preAggregateStats } from './engine/insightEngine.js';
import { getDbReader, getDbAdmin, initRegistry, safeQuery } from './services/db.js';
import { querySimilarIncidents } from './services/chroma.js';

const app = express();
app.use(cors());
app.use(express.json());

// Basic request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Global exception handlers
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err.message);
    if (!err.message.includes('Pipe.onStreamRead') && !err.message.includes('socket')) {
        process.exit(1);
    }
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Shared state for streaming
interface QueryContext {
    intent: string;
    mock?: boolean;
    visualizations: any[];
}
let currentQueryObj: QueryContext | null = null;
let lastStatsJson = "";

import { bootstrapNeuralDashboards } from './services/bootstrap.js';

async function startServer() {
    let retries = 20; // Increased retries
    while (retries > 0) {
        try {
            await initRegistry();
            console.log("Registry initialized successfully.");
            
            // Trigger neural discovery in the background after a short delay
            // to allow generator to seed some initial data
            setTimeout(() => {
                console.log("[Intelligence] Starting neural discovery mission...");
                bootstrapNeuralDashboards();
            }, 10000);
            
            break;
        } catch (e: any) {
            console.warn(`Registry init failed, retrying in 5s... (${retries} left). Error: ${e.message}`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}
startServer();

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/query', async (req, res) => {
    const { intent, mock } = req.body;
    if (!intent) return res.status(400).json({ error: "Intent required" });

    try {
        const visualizations = await parseIntentToStory(intent, 3, mock);
        
        // Populate initial data for visualizations
        const dbReader = getDbReader();
        const hydratedVisuals = await Promise.all(visualizations.map(async (v: any) => {
            try {
                const data = await safeQuery(v.sql);
                return { ...v, data };
            } catch (e) {
                return { ...v, data: [], error: "Data fetch failed" };
            }
        }));

        const mainData = hydratedVisuals.length > 0 ? hydratedVisuals[0].data : [];
        const { stats, insight } = await generateInsight(intent, mainData, mock);
        
        currentQueryObj = { intent, mock, visualizations: hydratedVisuals };
        lastStatsJson = JSON.stringify(stats);

        res.json({
            visualizations: hydratedVisuals,
            insight,
            stats
        });
    } catch (e: any) {
        console.error("Query Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/dashboards', async (req, res) => {
    try {
        const rows = await safeQuery('SELECT * FROM observability.dashboard_configs ORDER BY created_at DESC');
        res.json(rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/dashboards', async (req, res) => {
    const { name, intent, refresh_interval_ms } = req.body;
    try {
        const client = getDbAdmin();
        await client.insert({
            table: 'observability.dashboard_configs',
            values: [{ name, intent, refresh_interval_ms: refresh_interval_ms || 30000 }],
            format: 'JSONEachRow'
        });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/query/raw', async (req, res) => {
    const { sql } = req.body;
    if (!sql) return res.status(400).json({ error: "SQL required" });
    try {
        const data = await safeQuery(sql);
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/logs', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const service = req.query.service as string;
    
    let where = '';
    if (service) where = `WHERE service_name = '${service}'`;

    try {
        const logs = await safeQuery(`SELECT * FROM observability.telemetry_metrics ${where} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`);
        const countRes = await safeQuery(`SELECT count() as count FROM observability.telemetry_metrics ${where}`);
        res.json({ logs, total: countRes[0].count });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/patterns', async (req, res) => {
    try {
        const patterns = await querySimilarIncidents("anomalous behavior", 10);
        res.json(patterns);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

wss.on('connection', (ws, req) => {
    console.log(`[${new Date().toISOString()}] WebSocket client connection attempt from ${req.socket.remoteAddress}`);
    console.log("WebSocket client connected");
    const interval = setInterval(async () => {
        if (!currentQueryObj) return;
        try {
            // Re-fetch data for all visualizations using safe wrapper
            const freshVisualizations = await Promise.all(currentQueryObj.visualizations.map(async (v: any) => {
                const data = await safeQuery(v.sql);
                return { ...v, data };
            }));

            const mainData = freshVisualizations.length > 0 ? freshVisualizations[0].data : [];
            const currentStats = preAggregateStats(mainData);
            
            let newInsight = null;
            if (currentStats.hasSignificantDeviation && JSON.stringify(currentStats) !== lastStatsJson) {
                 const generated = await generateInsight(currentQueryObj.intent, mainData, currentQueryObj.mock);
                 newInsight = generated.insight;
                 lastStatsJson = JSON.stringify(currentStats);
            }

            ws.send(JSON.stringify({ 
                visualizations: freshVisualizations, 
                stats: currentStats, 
                newInsight 
            }));
        } catch (e) {
            // Silently ignore interval errors to prevent UI noise, but log for debug
            console.error("WS Interval Error:", (e as any).message);
        }
    }, 5000); // Relaxed to 5s for stability
    ws.on('close', () => {
        console.log("WebSocket client disconnected");
        clearInterval(interval);
    });
});

const PORT = Number(process.env.PORT) || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API and WS Server running on http://0.0.0.0:${PORT}`);
});
