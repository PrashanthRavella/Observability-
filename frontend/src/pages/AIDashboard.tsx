import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { DynamicChart } from '../components/DynamicChart';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Save, Search, ChevronRight, Clock, Sparkles, Zap, Shield, Cpu, Activity as ActivityIcon, Info, AlertCircle } from 'lucide-react';

export default function AIDashboard() {
  const location = useLocation();
  const [intent, setIntent] = useState('');
  const [visualizations, setVisualizations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Handle incoming intent from Registry or state
  useEffect(() => {
    if (location.state?.intent) {
        handleQuery(location.state.intent);
        // Clear state to prevent re-trigger on refresh
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchDashboards = useCallback(async () => {
    try {
        const res = await fetch('http://127.0.0.1:8080/api/dashboards');
        const data = await res.json();
        setDashboards(data);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchDashboards();
    const ws = new WebSocket(`ws://${window.location.hostname}:8080`);
    ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.visualizations) setVisualizations(payload.visualizations);
        if (payload.stats) setStats(payload.stats);
        if (payload.newInsight) setInsight(payload.newInsight);
    };
    return () => ws.close();
  }, [fetchDashboards]);

  const handleQuery = async (queryIntent?: string) => {
    const targetIntent = queryIntent || intent;
    if (!targetIntent) return;
    
    setLoading(true);
    setErrorMsg(null);
    try {
        const res = await fetch('http://127.0.0.1:8080/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intent: targetIntent, mock: isMock })
        });
        const json = await res.json();
        if (!res.ok) { setErrorMsg(json.error || "Query failed"); return; }

        setInsight(json.insight);
        setStats(json.stats);
        setVisualizations(json.visualizations);
        if (!queryIntent) setIntent(targetIntent);
    } catch (e: any) {
        setErrorMsg("Failed to connect to backend server.");
    } finally {
        setLoading(false);
    }
  };

  const saveDashboard = async () => {
    if (!intent || visualizations.length === 0) return;
    setIsSaving(true);
    try {
        const name = prompt("Enter a name for this dashboard:", "New Storyboard") || "Untitled Dashboard";
        await fetch('http://127.0.0.1:8080/api/dashboards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, intent })
        });
        fetchDashboards();
    } catch (e) {
        alert("Failed to save dashboard");
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="p-10 space-y-10">
      {/* Top Section: Query & Global Actions */}
      <section className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center px-4">
            <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-widest">
                <Sparkles className="w-4 h-4" />
                <span>AI Core v5</span>
            </div>
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 hover:border-white/10 transition">
                    <span>MOCK MODE</span>
                    <input type="checkbox" checked={isMock} onChange={e => setIsMock(e.target.checked)} className="accent-accent" />
                </label>
                {visualizations.length > 0 && (
                    <button 
                        onClick={saveDashboard}
                        disabled={isSaving}
                        className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-400/5 hover:bg-emerald-400/10 border border-emerald-400/20 px-4 py-1.5 rounded-full transition-all"
                    >
                        <Save className="w-3 h-3" />
                        {isSaving ? 'SAVING...' : 'PERSIST STORY'}
                    </button>
                )}
            </div>
        </div>

        <div className="glass-panel p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10 flex items-center gap-4 transition-all duration-500 focus-within:border-accent/40 focus-within:shadow-accent/5">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Search className="text-gray-500 w-5 h-5" />
            </div>
            <input 
                className="query-input h-12"
                value={intent}
                onChange={e => setIntent(e.target.value)}
                placeholder="Examine latency patterns for production API gateway over the last 24 hours..."
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
            />
            <button 
                onClick={() => handleQuery()} 
                disabled={loading}
                className="btn-primary"
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>ANALYZING...</span>
                    </div>
                ) : (
                    <>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>GENERATE STORY</span>
                    </>
                )}
            </button>
        </div>
      </section>

      {errorMsg && (
        <div className="max-w-5xl mx-auto flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl shadow-xl shadow-red-500/5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {visualizations.length === 0 && !loading && !errorMsg ? (
        <section className="max-w-6xl mx-auto pt-20">
            <div className="flex flex-col items-center justify-center p-24 text-center border border-white/[0.05] bg-white/[0.01] rounded-[3rem] group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                <div className="relative z-10">
                    <div className="w-24 h-24 mb-8 rounded-[2rem] bg-accent/10 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.15)] group-hover:scale-110 group-hover:shadow-[0_0_80px_rgba(59,130,246,0.25)] transition-all duration-700">
                        <Sparkles className="w-12 h-12 text-accent animate-float" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">System Core Ready</h3>
                    <p className="text-gray-500 max-w-md mx-auto font-medium leading-relaxed">
                        The neural discovery engine is idling. Input a diagnostic intent to generate a multi-faceted architectural storyboard.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-4">
                        <div className="h-px w-12 bg-white/5"></div>
                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-[0.3em]">Awaiting Instruction</span>
                        <div className="h-px w-12 bg-white/5"></div>
                    </div>
                </div>
            </div>
        </section>
      ) : (
        <div className="dashboard-grid">
           {/* Main Visualization Content (8 cols) */}
           <div className="col-span-12 lg:col-span-9 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {visualizations.map((viz, idx) => (
                        <div key={idx} className={`chart-panel h-[380px] group ${viz.type === 'line' ? 'md:col-span-2' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-accent h-6 px-2 bg-accent/10 border border-accent/20 rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ActivityIcon className="w-3 h-3" />
                                    Live Stream
                                </div>
                                <button className="p-1 text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                    <Info className="w-4 h-4" />
                                </button>
                            </div>
                            <ErrorBoundary>
                                <DynamicChart type={viz.type} title={viz.title} description={viz.description} data={viz.data} />
                            </ErrorBoundary>
                        </div>
                    ))}
                </div>
           </div>

           {/* Insights & Registry Sidebar (3 cols) */}
           <div className="col-span-12 lg:col-span-3 space-y-6">
                {/* Executive Brief Card */}
                <div className="glass-panel p-8 border-l-4 border-l-accent/50 group">
                    <div className="flex items-center gap-2 text-accent font-bold text-[10px] uppercase tracking-[0.2em] mb-4">
                        <Shield className="w-4 h-4" />
                        Intelligence
                    </div>
                    <h3 className="text-sm font-bold text-white mb-4">EXECUTIVE BRIEF</h3>
                    <p className="text-sm text-gray-400 leading-relaxed font-medium italic group-hover:text-gray-300 transition-colors">
                        "{insight || 'Recanting telemetry patterns and cross-referencing with historical incidents...'}"
                    </p>
                </div>

                {/* Key Metrics Grid */}
                {stats && (
                    <div className="glass-panel p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Signal Stats</h3>
                            <Cpu className="w-4 h-4 text-gray-700" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="metric-card">
                                <div className="text-[9px] font-bold text-gray-600 uppercase mb-2">P95 LATENCY</div>
                                <div className="text-xl font-bold text-white tabular-nums">
                                    {stats.latency_p95?.toFixed(0)}<span className="text-xs ml-1 text-gray-500 font-normal">ms</span>
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="text-[9px] font-bold text-gray-600 uppercase mb-2">THROUGHPUT</div>
                                <div className="text-xl font-bold text-emerald-400 tabular-nums">
                                    {stats.count}<span className="text-[10px] ml-1 text-gray-700 font-normal uppercase">req</span>
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="text-[9px] font-bold text-gray-600 uppercase mb-2">ERRORS</div>
                                <div className={`text-xl font-bold tabular-nums ${stats.total_errors > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {stats.total_errors}
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="text-[9px] font-bold text-gray-600 uppercase mb-2">DEVIATION</div>
                                <div className={`text-xl font-bold tabular-nums ${stats.hasSignificantDeviation ? 'text-amber-500' : 'text-blue-500'}`}>
                                    {stats.hasSignificantDeviation ? 'HIGH' : 'LOW'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Patterns Sidebar */}
                <div className="glass-panel p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Registry</h3>
                        <Clock className="w-4 h-4 text-gray-700" />
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {dashboards.length === 0 ? (
                            <div className="text-center py-10 grayscale opacity-20">
                                <p className="text-xs text-gray-600 italic">Registry Empty.</p>
                            </div>
                        ) : (
                            dashboards.map((db, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuery(db.intent)}
                                    className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-accent/40 hover:bg-accent/5 transition-all group/item"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-400 group-hover/item:text-accent transition-colors">{db.name}</span>
                                        <ChevronRight className="w-3 h-3 text-gray-700 group-hover/item:text-accent" />
                                    </div>
                                    <p className="text-[10px] text-gray-600 italic line-clamp-2 leading-relaxed">
                                        {db.intent}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
           </div>
        </div>
      )}
    </div>
  );
}
