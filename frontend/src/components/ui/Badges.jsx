import React from 'react';

export function StatusBadge({ status }) {
  const map = {
    OPEN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    DRAFTING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    PENDING_REVIEW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    SUBMITTED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    WON: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    LOST: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    ACCEPTED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    VERIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    UNVERIFIED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    CHANGES_REQUESTED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    UNDER_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    RESPONSE_DRAFTED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    UNREVIEWED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    RESOLVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  };

  const style = map[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {status || 'UNKNOWN'}
    </span>
  );
}

export function RiskBadge({ level, score }) {
  const map = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  if (!level) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
        Pending ML Score
      </span>
    );
  }

  const style = map[level] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border ${style}`}>
      <span>{level}</span>
      {score !== undefined && score !== null && <span className="opacity-80">({score})</span>}
    </span>
  );
}
