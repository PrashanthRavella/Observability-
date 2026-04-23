import { safeQuery, getDbAdmin } from './db.js';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

const llm = new ChatOpenAI({
  modelName: process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini',
  temperature: 0.1,
  openAIApiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  configuration: {
      baseURL: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1')
  }
});

const DashboardDiscoverySchema = z.object({
    dashboards: z.array(z.object({
        name: z.string(),
        intent: z.string()
    })).min(3).max(5)
});

const discoveryPrompt = PromptTemplate.fromTemplate(`
You are an expert Observability Architect. 
Analyze the following sample of telemetry data from our database:
{sample}

Based on the services, endpoints, and error patterns you see, suggest 3 to 5 "Golden Dashboard" intents. 
Each intent should be a descriptive English sentence that an AI could use to generate a complex, multi-chart dashboard.
Example intent: "Analyze latency spikes for order-processor in us-east-1 and correlate with CPU usage"

CRITICAL: You must return a valid JSON object with the following structure:
{{
  "dashboards": [
    {{ "name": "Dashboard Name", "intent": "Full intent description string" }},
    ...
  ]
}}
Do not include any prose or markdown blocks outside the JSON.
`);

export async function bootstrapNeuralDashboards() {
    try {
        // 1. Check if we already have many dashboards (don't over-seed)
        const counts = await safeQuery("SELECT count() as c FROM observability.dashboard_configs");
        if (counts[0].c > 5) {
            console.log("[Intelligence] Dashboard registry already has sufficient depth. Skipping discovery.");
            return;
        }

        // 2. Fetch data sample
        console.log("[Intelligence] Sampling telemetry for neural discovery...");
        const sample = await safeQuery("SELECT service_name, endpoint, http_status, region, instance_type FROM observability.telemetry_metrics LIMIT 50");
        
        if (sample.length === 0) {
            console.log("[Intelligence] Database is empty. Waiting for generator to seed data before discovery.");
            return;
        }

        // 3. Ask LLM to design dashboards
        console.log("[Intelligence] Asking LLM to design tailored golden dashboards...");
        const response = await llm.invoke(await discoveryPrompt.format({
            sample: JSON.stringify(sample)
        }));

        let jsonStr = response.content.toString().trim();
        console.log("[Intelligence] Raw response:", jsonStr);
        
        // Robust JSON extraction
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const parsed = JSON.parse(jsonStr);
        const validated = DashboardDiscoverySchema.parse(parsed);

        // 4. Persist to DB
        const client = getDbAdmin();
        await client.insert({
            table: 'observability.dashboard_configs',
            values: validated.dashboards.map(d => ({ 
                name: `✦ ${d.name}`, 
                intent: d.intent, 
                refresh_interval_ms: 30000 
            })),
            format: 'JSONEachRow'
        });

        console.log(`[Intelligence] Successfully persisted ${validated.dashboards.length} neural-designed dashboards.`);

    } catch (e: any) {
        console.error("[Intelligence] Neural discovery failed:", e.message);
    }
}
