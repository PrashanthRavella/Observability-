import React, { useState, useEffect } from 'react';
import { Layout, Search, Plus, Clock, Sparkles, Database, ChevronRight, MoreVertical, Trash2, Edit3, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardManager() {
    const [dashboards, setDashboards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const fetchDashboards = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8080/api/dashboards');
            const data = await res.json();
            setDashboards(data);
        } catch (e) {
            console.error("Failed to fetch dashboards");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboards();
    }, []);

    const filtered = dashboards.filter(d => 
        d.name.toLowerCase().includes(search.toLowerCase()) || 
        d.intent.toLowerCase().includes(search.toLowerCase())
    );

    const neuralDashboards = filtered.filter(d => d.name.includes('✦'));
    const manualDashboards = filtered.filter(d => !d.name.includes('✦'));

    return (
        <div className="p-10 space-y-10">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Neural Registry</h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Manage AI-designed stories and manual forensics templates</p>
                </div>
                
                <div className="flex gap-4">
                    <button onClick={() => navigate('/builder')} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        <span>DESIGN NEW VIEW</span>
                    </button>
                </div>
            </header>

            <div className="glass-panel p-2 flex items-center gap-4 border-white/5 max-w-2xl">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Search className="text-gray-500 w-4 h-4" />
                </div>
                <input 
                    className="flex-1 bg-transparent border-none px-2 py-2 text-sm text-gray-200 focus:outline-none placeholder:text-gray-600 font-medium"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search registry by name, intent, or tag..."
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Neural Golden Dashboards */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <Sparkles className="w-5 h-5 text-accent" />
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">AI-Authored Dashboards</h2>
                        <div className="h-px flex-1 bg-white/5"></div>
                    </div>
                    
                    <div className="space-y-4">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/5"></div>)}
                            </div>
                        ) : neuralDashboards.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                                <p className="text-xs italic font-bold">No dynamic stories discovered yet.</p>
                            </div>
                        ) : neuralDashboards.map((db, i) => (
                            <div 
                                key={i}
                                onClick={() => navigate('/', { state: { intent: db.intent } })}
                                className="glass-panel p-6 border-white/5 hover:border-accent/40 bg-accent/[0.01] hover:bg-accent/5 transition-all group flex items-start gap-5 cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Zap className="w-6 h-6 text-accent" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-bold text-white text-base truncate">{db.name.replace('✦ ', '')}</h3>
                                        <div className="text-[8px] font-black bg-accent text-white px-2 py-0.5 rounded-full tracking-widest uppercase">Golden</div>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed italic pr-8 group-hover:text-gray-400 transition-colors">
                                        {db.intent}
                                    </p>
                                    <div className="flex items-center gap-4 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            Active Stream
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                            <Database className="w-3 h-3" />
                                            ClickHouse Shard
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-800 group-hover:text-accent self-center" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Manually Authored Dashboards */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <Layout className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Manual Forensics</h2>
                        <div className="h-px flex-1 bg-white/5"></div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/5"></div>)}
                            </div>
                        ) : manualDashboards.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                                <p className="text-xs italic font-bold">No manual templates captured.</p>
                            </div>
                        ) : manualDashboards.map((db, i) => (
                            <div 
                                key={i}
                                onClick={() => navigate('/', { state: { intent: db.intent } })}
                                className="glass-panel p-6 border-white/5 hover:border-emerald-500/40 bg-emerald-500/[0.01] hover:bg-emerald-500/5 transition-all group flex items-start gap-5 cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Database className="w-6 h-6 text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-bold text-white text-base truncate">{db.name}</h3>
                                        <div className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full tracking-widest uppercase">Deterministic</div>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-mono opacity-60">
                                        {db.intent}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
