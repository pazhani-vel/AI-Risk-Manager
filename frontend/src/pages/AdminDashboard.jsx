import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Users, Settings, Database, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            Role: ADMIN
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2">Administrator Console</h1>
          <p className="text-sm text-slate-400">Welcome, {user?.name} ({user?.email})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <Users className="w-5 h-5 text-rose-400" />
            <h3 className="font-semibold text-slate-200">User Management</h3>
          </div>
          <p className="text-xs text-slate-400">Manage internal accounts, role assignments, and merchant provisioning.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <Database className="w-5 h-5 text-rose-400" />
            <h3 className="font-semibold text-slate-200">Audit & Logs</h3>
          </div>
          <p className="text-xs text-slate-400">Inspect system-wide immutable activity logs and compliance history.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <Settings className="w-5 h-5 text-rose-400" />
            <h3 className="font-semibold text-slate-200">Global Config</h3>
          </div>
          <p className="text-xs text-slate-400">System thresholds, ML orchestrator settings, and LLM integrations.</p>
        </div>
      </div>
    </div>
  );
}
