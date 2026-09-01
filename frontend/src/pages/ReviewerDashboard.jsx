import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Sparkles, Scale, FileCheck } from 'lucide-react';

export default function ReviewerDashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            Role: REVIEWER
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2">Dispute Review & Defense Studio</h1>
          <p className="text-sm text-slate-400">Welcome, {user?.name} ({user?.email})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-slate-200">LLM Response Drafts</h3>
          </div>
          <p className="text-xs text-slate-400">Review AI generated rebuttal letters grounded in verified evidence documents.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <Scale className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-slate-200">Model B Win Probability</h3>
          </div>
          <p className="text-xs text-slate-400">Evaluate defense success scoring before issuing final decision approval.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <FileCheck className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-slate-200">Human Sign-off</h3>
          </div>
          <p className="text-xs text-slate-400">Enforce human-in-the-loop review to authorize submission to card schemes.</p>
        </div>
      </div>
    </div>
  );
}
