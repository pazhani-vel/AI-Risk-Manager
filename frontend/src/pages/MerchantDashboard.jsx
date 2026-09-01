import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Store, TrendingDown, AlertTriangle, FileText } from 'lucide-react';

export default function MerchantDashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Role: MERCHANT
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2">Merchant Risk Overview</h1>
          <p className="text-sm text-slate-400">Welcome, {user?.name} {user?.merchantId ? `(Merchant ID: ${user.merchantId})` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200">Loss Reduction</h3>
          </div>
          <p className="text-xs text-slate-400">Track prevented chargebacks, expected loss totals, and saved capital.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200">Dispute Alerts</h3>
          </div>
          <p className="text-xs text-slate-400">Active incoming chargebacks requiring evidence ingestion.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200">Evidence Vault</h3>
          </div>
          <p className="text-xs text-slate-400">Upload proofs of delivery, order invoices, and customer logs.</p>
        </div>
      </div>
    </div>
  );
}
