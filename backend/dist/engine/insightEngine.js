import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { querySimilarIncidents, storeIncident } from '../services/chroma.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
const llm = new ChatOpenAI({
    modelName: process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
    temperature: 0.1,
    openAIApiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1')
    }
});
// Circuit breaker: after consecutive 429s, pause LLM calls for 5 minutes
let llmCircuitOpen = false;
let circuitOpenedAt = 0;
const CIRCUIT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
let consecutiveFailures = 0;
const MAX_FAILURES = 3;
function isCircuitOpen() {
    if (!llmCircuitOpen)
        return false;
    if (Date.now() - circuitOpenedAt > CIRCUIT_TIMEOUT_MS) {
        llmCircuitOpen = false;
        consecutiveFailures = 0;
        console.log('[InsightEngine] Circuit breaker reset. Re-enabling AI analysis.');
        return false;
    }
    return true;
}
function recordSuccess() {
    consecutiveFailures = 0;
    llmCircuitOpen = false;
}
function recordFailure() {
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_FAILURES) {
        llmCircuitOpen = true;
        circuitOpenedAt = Date.now();
        console.warn(`[InsightEngine] Circuit breaker OPEN: Too many LLM failures. Pausing for ${CIRCUIT_TIMEOUT_MS / 60000} minutes.`);
    }
}
const insightPrompt = PromptTemplate.fromTemplate(`
You are an expert Observability Engineer.
Analyze the following Map-Reduced Statistical Summary of telemetry data. 
Identify any anomalies (e.g., abnormally high P95 latency, non-200 error bursts).
Consider context from previous similar incidents if provided.

Statistical Summary: {summary}
Memory Context (Similar Incidents): {context}

Output a brief, executive summary of your findings (max 4 sentences). Ensure it is actionable.
`);
// Calculate basic stats for the AI to reduce context
export function preAggregateStats(data) {
    if (!data || data.length === 0)
        return { count: 0 };
    let totalLatency = 0;
    let errors = 0;
    let max = -Infinity;
    let min = Infinity;
    const latencies = [];
    data.forEach(row => {
        const lat = row.latency_ms || 0;
        totalLatency += lat;
        latencies.push(lat);
        if (lat > max)
            max = lat;
        if (lat < min)
            min = lat;
        if (row.http_status >= 400)
            errors++;
    });
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Index] || 0;
    const avg = totalLatency / data.length;
    // Detect if mathematical deviation is > 10% (dummy check for trigger condition)
    // In a real system, you'd compare to historical baselines.
    const hasSignificantDeviation = p95 > 200 || errors > (data.length * 0.1);
    return {
        count: data.length,
        latency_min: min === Infinity ? 0 : min,
        latency_max: max === -Infinity ? 0 : max,
        latency_avg: avg,
        latency_p95: p95,
        total_errors: errors,
        hasSignificantDeviation
    };
}
export async function generateInsight(intent, rawData, forceMock = false) {
    const stats = preAggregateStats(rawData);
    if (forceMock || isCircuitOpen()) {
        let insight = forceMock
            ? "System is in Mock Mode. Statistical analysis still active."
            : `AI analysis paused (circuit breaker). Telemetry is ${stats.hasSignificantDeviation ? '⚠️ showing anomalies: high latency or errors detected.' : '✅ stable based on statistical baseline.'}`;
        return { stats, insight };
    }
    let contextStr = "No historical context found.";
    try {
        const memory = await querySimilarIncidents(JSON.stringify(stats));
        if (memory && memory.documents.length > 0) {
            contextStr = memory.documents.join('; ');
        }
    }
    catch (e) { }
    try {
        const response = await llm.invoke(await insightPrompt.format({
            summary: JSON.stringify(stats),
            context: contextStr
        }));
        const insightStr = response.content.toString();
        recordSuccess();
        if (stats.hasSignificantDeviation) {
            await storeIncident(`Stats: ${JSON.stringify(stats)}. Conclusion: ${insightStr}`, intent);
        }
        return { stats, insight: insightStr };
    }
    catch (error) {
        recordFailure();
        // Only log the first few failures per circuit period to avoid spam
        if (consecutiveFailures <= 1) {
            console.error('[InsightEngine] LLM call failed:', error.message.substring(0, 80));
        }
        let fallback = "AI analysis unavailable (quota/connectivity). ";
        fallback += stats.hasSignificantDeviation
            ? "⚠️ Statistical anomalies detected — high latency or error spikes present."
            : "✅ Telemetry appears stable based on current statistical aggregation.";
        return { stats, insight: fallback };
    }
}
