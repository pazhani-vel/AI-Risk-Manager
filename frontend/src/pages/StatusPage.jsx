import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, Cpu, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StatusPage() {
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', data: null, error: null });
  const [loading, setLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const checkHealth = async () => {
    setLoading(true);
    setBackendHealth({ status: 'checking', data: null, error: null });
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setBackendHealth({ status: 'healthy', data, error: null });
    } catch (err) {
      setBackendHealth({ status: 'error', data: null, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
          <ShieldCheck className="w-12 h-12 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">System Health & Status</h1>
        <p className="mt-2 text-slate-400 text-sm sm:text-base">
          Real-time service readiness across frontend, API gateway, and microservices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Frontend Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Cpu className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Frontend Client</h3>
                <p className="text-xs text-slate-400">React + Vite + Tailwind</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Operational
            </span>
          </div>
          <p className="text-sm text-slate-400">
            UI runtime active. Environment configured with <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">VITE_API_URL</code>.
          </p>
        </div>

        {/* Backend Gateway Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Server className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Backend API Gateway</h3>
                <p className="text-xs text-slate-400">Express + Mongoose</p>
              </div>
            </div>
            {backendHealth.status === 'healthy' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            )}
            {backendHealth.status === 'checking' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Probing...
              </span>
            )}
            {backendHealth.status === 'error' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                Unreachable
              </span>
            )}
          </div>
          <div className="text-sm text-slate-400">
            {backendHealth.status === 'healthy' && (
              <div className="space-y-1">
                <p>Status: <span className="text-emerald-400 font-medium">{backendHealth.data?.status}</span></p>
                <p>Service: <span className="text-slate-200">{backendHealth.data?.service}</span></p>
              </div>
            )}
            {backendHealth.status === 'checking' && <p>Querying {apiUrl}/health...</p>}
            {backendHealth.status === 'error' && (
              <p className="text-rose-400 text-xs">
                Could not connect to {apiUrl}/health ({backendHealth.error}). Ensure backend server is running.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={checkHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Service Health
        </button>
      </div>
    </div>
  );
}
