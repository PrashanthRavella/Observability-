import React, { useState, useEffect } from 'react';
import { History, Target, Zap, Layout, Search, Sparkles, Brain, Fingerprint, Calendar } from 'lucide-react';

export default function PatternLog() {
    const [patterns, setPatterns] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchPatterns = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8080/api/patterns');
            const data = await res.json();
            setPatterns(data);
        } catch (e) {
            console.error("Failed to fetch patterns");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatterns();
    }, []);

    const documents = patterns?.documents?.[0] || [];
    const metadatas = patterns?.metadatas?.[0] || [];

    return (
        <div className="p-10 h-full flex flex-col space-y-10">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">RAG Intelligence Memory</h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Vector-indexed historical anomalies stored in ChromaDB</p>
                </div>
                <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-2xl px-6 py-2">
                    <Brain className="w-5 h-5 text-accent animate-pulse-soft" />
                    <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Neural Engine Active</span>
                </div>
            </header>

            <div className="flex-1 overflow-auto space-y-6 pr-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-60">
                        <div className="relative">
                            <Sparkles className="w-12 h-12 text-accent animate-spin" />
                            <Fingerprint className="absolute inset-0 m-auto w-6 h-6 text-accent opacity-50" />
                        </div>
                        <span className="text-[10px] font-black tracking-[0.4em] uppercase text-accent/80">Re-indexing Vector Space...</span>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="glass-panel p-32 flex flex-col items-center justify-center text-center border-dashed border-white/5 group hover:border-accent/10 transition-colors">
                        <History className="w-16 h-16 text-gray-800 mb-6 group-hover:scale-110 transition-transform duration-500" />
                        <h3 className="text-xl font-bold text-gray-400">Neural logs are currently vacant</h3>
                        <p className="text-sm text-gray-600 max-w-sm mt-3 font-medium">Patterns are automatically indexed when the AI Core identifies significant signal deviations during live analysis.</p>
                    </div>
                ) : (
                    documents.map((doc: string, i: number) => {
                        const meta = metadatas[i] || {};
                        return (
                            <div key={i} className="glass-panel p-8 border-l-4 border-l-accent/50 hover:bg-white/[0.01] transition-all duration-300 relative group">
                                <div className="absolute top-6 right-8 flex gap-3">
                                    <div className="flex items-center gap-2 bg-accent/10 text-accent text-[9px] font-black px-3 py-1 rounded-full border border-accent/20 uppercase tracking-widest">
                                        <Zap className="w-3 h-3 fill-current" />
                                        Indexed
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 text-gray-500 text-[9px] font-bold px-3 py-1 rounded-full border border-white/10 uppercase">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(meta.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                                
                                <div className="flex gap-8 items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center flex-shrink-0 border border-accent/10 group-hover:bg-accent/10 transition-colors">
                                        <Target className="w-6 h-6 text-accent" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-gray-200 uppercase tracking-tight text-xs">Analysis Intent:</h3>
                                                <div className="h-px flex-1 bg-white/5"></div>
                                            </div>
                                            <p className="text-base font-semibold text-accent italic">"{meta.intent}"</p>
                                        </div>

                                        <div className="bg-black/30 p-6 rounded-2xl border border-white/5 relative overflow-hidden group-hover:border-white/10 transition-colors">
                                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                                <Brain className="w-20 h-20" />
                                            </div>
                                            <p className="text-xs text-gray-400 leading-relaxed font-medium font-mono relative z-10">
                                                {doc}
                                            </p>
                                        </div>

                                        <div className="flex gap-6 pt-2">
                                            <button className="flex items-center gap-2 text-[10px] font-black text-accent hover:text-white transition-all uppercase tracking-[0.2em] group/btn">
                                                <Fingerprint className="w-4 h-4 group-btn:scale-110 transition-transform" />
                                                Run Forensics
                                            </button>
                                            <button className="flex items-center gap-2 text-[10px] font-black text-gray-600 hover:text-gray-300 transition-all uppercase tracking-[0.2em]">
                                                <Layout className="w-4 h-4" />
                                                Regenerate Dashboard
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <aside className="glass-panel p-6 flex gap-10 items-center border-t-2 border-t-accent/20">
                <div className="flex items-center gap-4 border-r border-white/5 pr-10">
                    <div className="w-10 h-10 bg-accent/5 rounded-xl border border-accent/20 flex items-center justify-center shadow-lg shadow-accent/5">
                        <Search className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Vector Search</div>
                        <div className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Similarity threshold: 0.85 (Neural)</div>
                    </div>
                </div>
                <div className="text-xs text-gray-500 max-w-2xl leading-relaxed font-medium">
                    The Memory module uses <span className="text-accent font-black">RAG (Retrieval Augmented Generation)</span> to optimize real-time analysis. By cross-referencing live telemetry with the historical vector space, the engine can identify reoccurring infrastructure patterns and predict degradation before it occurs.
                </div>
            </aside>
        </div>
    );
}
