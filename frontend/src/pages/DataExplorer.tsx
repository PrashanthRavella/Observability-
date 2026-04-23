import React, { useState, useEffect } from 'react';
import { Table, Filter, ChevronLeft, ChevronRight, Activity, Globe, User, ShieldAlert, Cpu } from 'lucide-react';

export default function DataExplorer() {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [service, setService] = useState('');
    const [loading, setLoading] = useState(false);
    const limit = 50;

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const url = `http://127.0.0.1:8080/api/logs?limit=${limit}&offset=${page * limit}&service=${service}`;
            const res = await fetch(url);
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
        } catch (e) {
            console.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, service]);

    return (
        <div className="p-10 h-full flex flex-col space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Signal Stream</h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Direct inspection of ClickHouse telemetry buffer</p>
                </div>
                
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-4 py-2 hover:border-white/10 transition-colors">
                        <Filter className="w-4 h-4 text-accent" />
                        <select 
                            value={service} 
                            onChange={(e) => { setService(e.target.value); setPage(0); }}
                            className="bg-transparent border-none text-xs font-bold text-gray-400 focus:outline-none cursor-pointer uppercase tracking-widest"
                        >
                            <option value="" className="bg-dark-panel">All Entities</option>
                            <option value="api-gateway" className="bg-dark-panel">API Gateway</option>
                            <option value="auth-service" className="bg-dark-panel">Auth Service</option>
                            <option value="order-engine" className="bg-dark-panel">Order Engine</option>
                            <option value="payment-processor" className="bg-dark-panel">Payment Processor</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-white/5 rounded-2xl p-1 border border-white/5">
                        <button 
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-20"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-black px-4 text-gray-400 tracking-tighter uppercase">
                            PG {page + 1}
                        </span>
                        <button 
                            disabled={(page + 1) * limit >= total}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-20"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="glass-panel flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02] text-gray-500 border-b border-white/5">
                                <th className="px-6 py-5 font-bold tracking-widest uppercase">Temporal Marker</th>
                                <th className="px-6 py-5 font-bold tracking-widest uppercase text-accent">Service Instance</th>
                                <th className="px-6 py-5 font-bold tracking-widest uppercase">Vector Paths</th>
                                <th className="px-6 py-5 font-bold tracking-widest uppercase">Health</th>
                                <th className="px-6 py-5 font-bold tracking-widest uppercase">Context (Tier/Reg)</th>
                                <th className="px-6 py-5 font-bold tracking-widest uppercase text-emerald-500">Value</th>
                                <th className="px-6 py-5 font-bold tracking-widest uppercase">Signal Forensics</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-40 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                                            <span className="text-gray-500 font-bold animate-pulse tracking-[0.2em] text-[10px] uppercase">Retrieving shards from ClickHouse...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.map((log, i) => (
                                <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-4 text-accent/70 font-mono whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                        <span className="text-[9px] ml-2 opacity-30">{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-black text-gray-300 uppercase tracking-tight">{log.service_name}</span>
                                            <span className="text-[9px] text-gray-600 font-mono">{log.pod_name.split('-').slice(-1)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-gray-400 font-mono group-hover:text-white transition-colors">{log.endpoint}</span>
                                            <span className="text-[8px] text-gray-600 font-mono tracking-tighter opacity-50">{log.trace_id.substring(0, 8)}...</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`font-black text-xs ${log.http_status >= 500 ? 'text-red-500' : log.http_status >= 400 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {log.http_status}
                                            </span>
                                            <div className="h-1 bg-white/5 w-16 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${log.latency_ms > 1000 ? 'bg-red-500' : log.latency_ms > 300 ? 'bg-amber-500' : 'bg-accent'}`} 
                                                    style={{ width: `${Math.min(100, log.latency_ms / 20)}%` }}
                                                />
                                            </div>
                                            <span className="text-gray-500 font-mono text-[10px]">{log.latency_ms.toFixed(0)}ms</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                    log.user_tier === 'enterprise' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                                                    log.user_tier === 'pro' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                                                    'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                                                }`}>
                                                    {log.user_tier}
                                                </span>
                                                <span className="text-gray-400 font-bold">{log.user_id}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-3 h-3 text-gray-600" />
                                                <span className="text-[9px] text-gray-500 uppercase tracking-widest">{log.region}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.transaction_value > 0 ? (
                                            <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                                                <span className="text-[9px] opacity-50">$</span>
                                                {log.transaction_value.toFixed(2)}
                                            </div>
                                        ) : (
                                            <span className="text-gray-700 font-mono">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.error_message ? (
                                            <div className="flex items-center gap-2 text-red-400/80 bg-red-400/5 p-2 rounded-lg border border-red-500/10">
                                                <ShieldAlert className="w-3 h-3 shrink-0" />
                                                <span className="text-[9px] font-medium leading-tight line-clamp-2 italic italic">{log.error_message}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-emerald-500/40">
                                                <Cpu className="w-3 h-3" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Normal Ops ({log.instance_type})</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <footer className="flex justify-between items-center px-4">
                <div className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.25em]">
                    Sync Status: <span className="text-accent animate-pulse">Streaming</span> / <span className="text-gray-500">{total.toLocaleString()}</span> Events Cached
                </div>
                <div className="text-[9px] text-gray-700 font-black uppercase tracking-tighter italic">
                    Internal Data Shard: ClickHouse-Obs-Production-01
                </div>
            </footer>
        </div>
    );
}
