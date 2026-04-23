import { ChromaClient } from 'chromadb';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

export const chromaClient = new ChromaClient({
    path: CHROMA_URL
});

export const getCollection = async () => {
    return await chromaClient.getOrCreateCollection({
        name: "incident_memory",
    });
};

export async function storeIncident(summary: string, intent: string) {
    const collection = await getCollection();
    const id = `inc_${Date.now()}`;
    await collection.add({
        ids: [id],
        metadatas: [{ intent, timestamp: Date.now() }],
        documents: [summary],
    });
}

export async function querySimilarIncidents(queryText: string, nResults = 3) {
    try {
        const collection = await getCollection();
        const results = await collection.query({
            queryTexts: [queryText],
            nResults,
        });
        return results;
    } catch {
        return null; // For local dev without Chroma fully spun up yet
    }
}
