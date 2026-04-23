import { createClient, ClickHouseClient } from '@clickhouse/client';

let reader: ClickHouseClient | null = null;
let admin: ClickHouseClient | null = null;

// Lazy client initialization to prevent early connection failures
// Removed dotenv as Docker environment handles variables more reliably
export function getDbReader(): ClickHouseClient {
    if (!reader) {
        console.log("[DB] Initializing Reader Client...");
        reader = createClient({
            host: process.env.CLICKHOUSE_HOST || 'http://clickhouse:8123',
            username: process.env.DB_VIEWER_USER || 'optic_read_only',
            password: process.env.DB_VIEWER_PASS || 'secure_read_123',
            database: 'observability',
            // Increase timeout for slow cold starts
            clickhouse_settings: {
                connect_timeout: 10,
            }
        });
    }
    return reader;
}

export function getDbAdmin(): ClickHouseClient {
    if (!admin) {
        console.log("[DB] Initializing Admin Client...");
        admin = createClient({
            host: process.env.CLICKHOUSE_HOST || 'http://clickhouse:8123',
            username: process.env.CLICKHOUSE_USER || 'admin',
            password: process.env.CLICKHOUSE_PASSWORD || 'admin_password',
            database: 'observability',
            clickhouse_settings: {
                connect_timeout: 10,
            }
        });
    }
    return admin;
}

/**
 * Safe wrapper for ClickHouse commands to prevent unhandled socket crashes
 */
export async function safeCommand(query: string) {
    const client = getDbAdmin();
    try {
        return await client.command({ query });
    } catch (e: any) {
        console.error(`[DB ERROR] Command failed: ${query.substring(0, 50)}... Error: ${e.message}`);
        // If it's a pipe/socket error, we might want to reset the client
        if (e.message.includes('Pipe') || e.message.includes('socket')) {
            admin = null; // Force recreation on next call
        }
        throw e;
    }
}

/**
 * Safe wrapper for ClickHouse queries
 */
export async function safeQuery(query: string) {
    const client = getDbReader();
    try {
        const rs = await client.query({ query, format: 'JSONEachRow' });
        return await rs.json() as any[];
    } catch (e: any) {
        console.error(`[DB ERROR] Query failed: ${query.substring(0, 50)}... Error: ${e.message}`);
        if (e.message.includes('Pipe') || e.message.includes('socket')) {
            reader = null; // Force recreation on next call
        }
        throw e;
    }
}

export async function initRegistry() {
    try {
        await safeCommand(`
            CREATE TABLE IF NOT EXISTS observability.dashboard_configs (
                id UUID DEFAULT generateUUIDv4(),
                name String,
                intent String,
                refresh_interval_ms UInt32 DEFAULT 60000,
                created_at DateTime DEFAULT now()
            ) ENGINE = MergeTree()
            ORDER BY created_at
        `);
        
        const rows = await safeQuery("SELECT count() as c FROM observability.dashboard_configs");
        
        if (rows.length > 0 && rows[0].c === "0") {
            const goldenDashboards = [
                { name: 'Service Reliability', intent: 'Analyze P95 latency and error rate distribution across all microservices' },
                { name: 'Resource Saturation', intent: 'Identify pods with CPU usage above 90% and correlate with memory consumption' },
                { name: 'User Impact Analysis', intent: 'Show error frequency grouped by user_id and region to identify localized outages' },
                { name: 'Infrastructure Health', intent: 'Breakdown of telemetry by instance_type and hostname to identify faulty hardware' },
                { name: 'Network Forensics', intent: 'Compare net_tx vs net_rx across environment types' }
            ];
            
            const client = getDbAdmin();
            await client.insert({
                table: 'observability.dashboard_configs',
                values: goldenDashboards.map(d => ({ name: d.name, intent: d.intent, refresh_interval_ms: 30000 })),
                format: 'JSONEachRow'
            });
            console.log("[DB] Advanced Golden Dashboards bootstrapped.");
        } else {
            console.log("[DB] Dashboard registry initialized.");
        }
    } catch (e) {
        console.error("[DB] Init failed:", e);
        throw e; // Propagate to retry loop
    }
}
