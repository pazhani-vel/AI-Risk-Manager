import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LineChart, Binary, Cpu, Sliders } from 'lucide-react';

export default function AnalystDashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            Role: RISK_ANALYST
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2">Risk Intelligence & Analytics</h1>
          <p className="text-sm text-slate-400">Welcome, {user?.name} ({user?.email})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-slate-200">Model A Performance</h3>
          </div>
          <p className="text-xs text-slate-400">Evaluate ROC-AUC, Precision-Recall, and calibration curves on held-out test splits.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <Binary className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-slate-200">Feature Importance</h3>
          </div>
          <p className="text-xs text-slate-400">Inspect SHAP values, risk anomaly clusters, and chargeback velocity trends.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-slate-200">Decision Thresholds</h3>
          </div>
          <p className="text-xs text-slate-400">Tune cutoffs for Low, Medium, High, and Critical transaction loss bands.</p>
        </div>
      </div>
    </div>
  );
}
