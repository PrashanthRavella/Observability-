import React, { useState } from 'react';
import { Play, Database, AlertCircle, FileJson, Sparkles, Save, Layout, BarChart3 } from 'lucide-react';
import { DynamicChart } from '../components/DynamicChart';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function ManualBuilder() {
    const [sql, setSql] = useState('SELECT\n  service_name,\n  avg(latency_ms) as latency,\n  count() as requests\nFROM observability.telemetry_metrics\nWHERE timestamp > now() - interval 1 hour\nGROUP BY service_name\nORDER BY latency DESC\nLIMIT 10');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vizType, setVizType] = useState('bar');
    const [isSaving, setIsSaving] = useState(false);

    const executeSql = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://127.0.0.1:8080/api/query/raw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Query failed");
            setResults(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const persistVisual = async () => {
        if (results.length === 0) return;
        setIsSaving(true);
        try {
            const name = prompt("Name this visualization:", "Custom View") || "Untitled";
            // For now, we save it as a dashboard entry so it appears in the sidebar
            await fetch('http://127.0.0.1:8080/api/dashboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, intent: `RAW_SQL: ${sql}` }) 
            });
            alert("Visualization persisted to registry.");
        } catch (e) {
            alert("Persistence failed");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-10 h-full flex flex-col space-y-10">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Pro Query Studio</h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Advanced SQL workspace with live visual rendering</p>
                </div>
                
                <div className="flex gap-4">
                    <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1">
                        {['bar', 'line', 'pie', 'gauge'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setVizType(type)}
                                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${vizType === type ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </header>
            
            <div className="flex-1 flex gap-8 min-h-0">
                {/* Editor Side */}
                <div className="w-1/2 flex flex-col gap-6">
                    <div className="glass-panel flex-1 flex flex-col overflow-hidden">
                        <div className="bg-white/[0.02] px-6 py-4 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Database className="w-5 h-5 text-accent" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">SQL Workstation</span>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={executeSql}
                                    disabled={loading}
                                    className="btn-primary scale-90"
                                >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>{loading ? 'EXECUTING...' : 'RUN ANALYTICS'}</span>
                                </button>
                            </div>
                        </div>
                        <textarea 
                            className="flex-1 bg-black/40 p-8 text-emerald-400 font-mono text-sm focus:outline-none resize-none selection:bg-accent/20"
                            value={sql}
                            onChange={(e) => setSql(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Preview Side */}
                <div className="w-1/2 flex flex-col gap-6">
                    <div className="glass-panel flex-1 flex flex-col overflow-hidden relative">
                        <div className="bg-white/[0.02] px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BarChart3 className="w-5 h-5 text-emerald-400" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Visual Preview</span>
                            </div>
                            {results.length > 0 && (
                                <button 
                                    onClick={persistVisual}
                                    disabled={isSaving}
                                    className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest flex items-center gap-2"
                                >
                                    <Save className="w-3 h-3" />
                                    {isSaving ? 'PERSISTING...' : 'PERSIST TO REGISTRY'}
                                </button>
                            )}
                        </div>
                        
                        <div className="flex-1 p-8 overflow-auto">
                            {error ? (
                                <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl flex flex-col items-center justify-center gap-4 text-red-400 text-center">
                                    <AlertCircle className="w-10 h-10" />
                                    <div className="space-y-1">
                                        <p className="font-black uppercase tracking-widest text-[10px]">Compiler Error</p>
                                        <p className="text-xs font-mono leading-relaxed opacity-80">{error}</p>
                                    </div>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="h-full flex flex-col">
                                    <div className="flex-1 min-h-[300px]">
                                        <ErrorBoundary>
                                            <DynamicChart 
                                                type={vizType} 
                                                title="Visual Output" 
                                                description="Manually defined signal aggregation" 
                                                data={results} 
                                            />
                                        </ErrorBoundary>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <FileJson className="w-4 h-4 text-emerald-500/50" />
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Object Schema ({results.length} Nodes)</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {results.slice(0, 3).map((row, i) => (
                                                <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap italic">
                                                    {JSON.stringify(row)}
                                                </div>
                                            ))}
                                            {results.length > 3 && (
                                                <div className="text-[10px] text-gray-700 font-bold ml-2">... +{results.length - 3} additional nodes</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                                    <Layout className="w-16 h-16 text-gray-600 mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Awaiting Execution</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <footer className="glass-panel p-6 border-t-2 border-t-emerald-500/20 flex items-center gap-6">
                <div className="flex items-center gap-3 shrink-0">
                    <Sparkles className="w-5 h-5 text-accent animate-pulse-soft" />
                    <div>
                        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-0.5">DB Discovery</div>
                        <div className="text-[9px] text-gray-600 font-bold uppercase">ClickHouse observability.telemetry_metrics is ready</div>
                    </div>
                </div>
                <div className="h-10 w-px bg-white/5"></div>
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    The Pro Query Studio allows for raw, deterministic access to the telemetry hardware. Persisting a query saves it to the <span className="text-white">Neural Registry</span>, where the AI core can later use it as a reference for automatic storyboarding.
                </p>
            </footer>
        </div>
    );
}
