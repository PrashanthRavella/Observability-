import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, Database, Sparkles, LayoutDashboard, Settings, HelpCircle, Bell, Cpu } from 'lucide-react';
import AIDashboard from './pages/AIDashboard';
import ManualBuilder from './pages/ManualBuilder';
import DataExplorer from './pages/DataExplorer';
import PatternLog from './pages/PatternLog';

import DashboardManager from './pages/DashboardManager';

import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [isBackendOnline, setIsBackendOnline] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8080/api/health`);
        setIsBackendOnline(res.ok);
      } catch (e) {
        setIsBackendOnline(false);
      }
    };
    checkHealth();
    const timer = setInterval(checkHealth, 5000);
    return () => clearInterval(timer);
  }, []);

  const navLinks = [
    { name: 'AI Dashboard', path: '/', icon: <Sparkles className="w-5 h-5" /> },
    { name: 'Dashboard Registry', path: '/registry', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Query Studio', path: '/builder', icon: <Cpu className="w-5 h-5" /> },
    { name: 'Signal Stream', path: '/explorer', icon: <Database className="w-5 h-5" /> },
    { name: 'Neural Memory', path: '/patterns', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-dark-bg text-gray-200">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 bg-dark-panel/50 backdrop-blur-3xl flex flex-col flex-shrink-0 z-10">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Optic <span className="text-blue-500">V5.0</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Autonomous Obs</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Main Menu</p>
          </div>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            );
          })}
          
          <div className="px-4 mt-8 mb-4">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">System</p>
          </div>
          <button className="nav-link w-full text-left">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <button className="nav-link w-full text-left">
            <HelpCircle className="w-5 h-5" />
            <span>Documentation</span>
          </button>
        </nav>

        <div className="p-6 mt-auto">
          <div className={`p-4 rounded-2xl border transition-all duration-500 group ${
            isBackendOnline 
              ? 'bg-emerald-500/5 border-emerald-500/10' 
              : 'bg-red-500/5 border-red-500/10'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shadow-[0_0_12px] ${
                  isBackendOnline 
                    ? 'bg-emerald-500 shadow-emerald-500/50 animate-pulse' 
                    : 'bg-red-500 shadow-red-500/50'
                }`}></div>
                <span className={`text-[10px] font-bold tracking-wider uppercase ${
                  isBackendOnline ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {isBackendOnline ? 'Operational' : 'Disconnected'}
                </span>
              </div>
              <Activity className={`w-3 h-3 ${isBackendOnline ? 'text-emerald-500/50' : 'text-red-500/50'}`} />
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
              {isBackendOnline 
                ? 'Core engine is processing telemetry streams in real-time.' 
                : 'Connection to local backend lost. Retrying...'}
            </p>
          </div>
        </div>
      </aside>

      {/* Header & Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-white/5 bg-dark-bg/20 backdrop-blur-md flex items-center justify-between px-10 flex-shrink-0 z-10">
            <div className="flex items-center gap-6">
                <div className="h-8 w-px bg-white/5"></div>
                <div className="text-xs font-medium text-gray-500">
                    Project: <span className="text-gray-300 font-semibold italic">Autonomous-Observability-Prod</span>
                </div>
            </div>
            
            <div className="flex items-center gap-5">
                <button className="p-2 hover:bg-white/5 rounded-full transition-colors relative">
                    <Bell className="w-5 h-5 text-gray-400" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-dark-bg"></span>
                </button>
                <div className="h-8 w-px bg-white/5"></div>
                <div className="flex items-center gap-3 pl-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-white/10"></div>
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto relative bg-[#06070a]">
          <ErrorBoundary fallbackMessage="The application core encountered a critical rendering error.">
            <Routes>
              <Route path="/" element={<AIDashboard />} />
              <Route path="/registry" element={<DashboardManager />} />
              <Route path="/builder" element={<ManualBuilder />} />
              <Route path="/explorer" element={<DataExplorer />} />
              <Route path="/patterns" element={<PatternLog />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;
