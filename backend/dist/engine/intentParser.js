import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { getDbReader as dbReader } from '../services/db.js';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';
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
// Define the expected output structure using Zod
export const VisualizationSchema = z.object({
    type: z.enum(['line', 'bar', 'gauge', 'pie']),
    title: z.string(),
    description: z.string(),
    sql: z.string().describe('The raw ClickHouse SELECT query')
});
export const StoryDashboardSchema = z.object({
    dashboards: z.array(VisualizationSchema).min(3).max(4)
});
const sqlPrompt = PromptTemplate.fromTemplate(`
You are a Staff ClickHouse DBA and data visualization expert. Parse the user's intent into a "Story Dashboard" — a multi-faceted view of the data.
You must return a raw JSON object containing an array of 3 to 4 visual dashboards. DO NOT return just one.

Table Schema: observability.telemetry_metrics
Columns: 
- timestamp (DateTime)
- service_name (String)
- endpoint (String)
- http_status (UInt16)
- latency_ms (Float64)
- cpu_usage_percent (Float32)
- memory_mb (UInt32)
- disk_io (Float32)
- net_tx (Float32)
- net_rx (Float32)
- hostname (String)
- pod_name (String)
- environment (String)
- trace_id (String)
- user_tier (String) - 'free', 'pro', or 'enterprise'
- db_latency_ms (Float64)
- cache_hit (UInt8) - 1 for hit, 0 for miss
- transaction_value (Float64) - Only for payment-processor service
- response_size_kb (Float64)
- region (String)
- instance_type (String)
- error_message (String)

Rules:
1. ALWAYS return valid JSON matching the schema precisely. No markdown wrappers. No explanations.
2. The JSON must have a root "dashboards" array.
3. You MUST return exactly 4 visualizations. DO NOT return fewer.
4. Each dashboard must have "type" ("line", "bar", "gauge", "pie"), "title", "description", and "sql".
5. "sql" must be valid, highly optimized ClickHouse SQL.
6. Provide a diverse story: 
   - 1x Timeline (line chart) for overall health.
   - 1x Distribution or Heatmap (bar chart) for segmented analysis.
   - 1x Business impact (pie or bar) using transaction_value or user_tier.
   - 1x Resource/Performance view (gauge or line) for system metrics.

User Intent: {intent}
{error_context}

Return exactly the JSON object and nothing else.
`);
export async function parseIntentToStory(intent, maxRetries = 3, forceMock = false) {
    if (forceMock) {
        return executeMockStory(intent);
    }
    let errorContext = '';
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await llm.invoke(await sqlPrompt.format({
                intent,
                error_context: errorContext ? `\nPREVIOUS ERROR (fix the issue): ${errorContext}` : ''
            }));
            let jsonStr = response.content.toString().trim();
            if (jsonStr.startsWith('```json'))
                jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
            else if (jsonStr.startsWith('```'))
                jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
            const parsedData = JSON.parse(jsonStr);
            const validated = StoryDashboardSchema.parse(parsedData);
            // Execute all SQL queries in parallel
            const reader = dbReader();
            const visualizations = await Promise.all(validated.dashboards.map(async (dash) => {
                const resultSet = await reader.query({ query: dash.sql, format: 'JSONEachRow' });
                const data = await resultSet.json();
                return { ...dash, data: data };
            }));
            // Filter out any visual that failed to fetch data
            const validVisualizations = visualizations.filter(v => v.data && v.data.length > 0);
            if (validVisualizations.length === 0)
                throw new Error("Queries succeeded but returned zero data");
            return validVisualizations;
        }
        catch (error) {
            console.error(`[Intent Parser Attempt ${attempt}] Error: ${error.message}`);
            if (attempt === maxRetries || error.message.includes('429')) {
                console.warn("[Intent Parser] LLM/Database Failed permanently. Falling back to Mock Story.");
                return executeMockStory(intent);
            }
            errorContext = error.message;
        }
    }
    throw new Error('Unreachable');
}
async function executeMockStory(intent) {
    const v1 = {
        type: 'line',
        title: 'End-to-End Latency Timeline',
        description: 'P95 latency trends for targeted services in the current context.',
        sql: "SELECT timestamp, latency_ms FROM observability.telemetry_metrics ORDER BY timestamp DESC LIMIT 50"
    };
    const v2 = {
        type: 'bar',
        title: 'Error Distribution by Endpoint',
        description: 'Comparative volumetric analysis of non-200 HTTP response codes.',
        sql: "SELECT endpoint, count() as err_count FROM observability.telemetry_metrics WHERE http_status >= 400 GROUP BY endpoint ORDER BY err_count DESC LIMIT 5"
    };
    const v3 = {
        type: 'pie',
        title: 'Customer Tier Segmentation',
        description: 'Breakdown of telemetry traffic across distinct user tiers.',
        sql: "SELECT user_tier, count() as count FROM observability.telemetry_metrics GROUP BY user_tier"
    };
    const v4 = {
        type: 'line',
        title: 'System resource Consumption',
        description: 'Correlation between CPU usage and memory pressure across regional clusters.',
        sql: "SELECT timestamp, cpu_usage_percent, memory_mb FROM observability.telemetry_metrics ORDER BY timestamp DESC LIMIT 30"
    };
    const visuals = [v1, v2, v3, v4];
    const reader = dbReader();
    const results = await Promise.all(visuals.map(async (v) => {
        try {
            const rowData = await reader.query({ query: v.sql, format: 'JSONEachRow' });
            return { ...v, data: await rowData.json() };
        }
        catch (e) {
            return { ...v, data: [] }; // Fallback empty if SQL fails
        }
    }));
    return results;
}
