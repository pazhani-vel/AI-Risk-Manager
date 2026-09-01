import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chargebackService } from '../../services/api';
import { StatCard } from '../../components/ui/ControlsAndStats';
import { StatusBadge } from '../../components/ui/Badges';
import { LoadingState } from '../../components/ui/ModalsAndStates';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Scale,
  AlertTriangle,
  Layers
} from 'lucide-react';

export default function ReviewerDashboardPage() {
  const [pendingDisputes, setPendingDisputes] = useState([]);
  const [historyDisputes, setHistoryDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    const fetchReviewerData = async () => {
      setLoading(true);
      try {
        const [pendingRes, allRes] = await Promise.all([
          chargebackService.getAll({ status: 'PENDING_REVIEW', limit: 8 }),
          chargebackService.getAll({ limit: 20 })
        ]);

        if (pendingRes.data.success) {
          setPendingDisputes(pendingRes.data.data || []);
          setMetrics((prev) => ({ ...prev, pending: pendingRes.data.data.length }));
        }

        if (allRes.data.success) {
          const all = allRes.data.data || [];
          const approved = all.filter((c) => c.reviewStatus === 'APPROVED').length;
          const rejected = all.filter((c) => c.reviewStatus === 'REJECTED').length;
          const history = all.filter((c) => ['APPROVED', 'REJECTED', 'SUBMITTED', 'RESOLVED'].includes(c.status));
          setHistoryDisputes(history.slice(0, 5));
          setMetrics((prev) => ({ ...prev, approved, rejected }));
        }
      } catch (err) {
        console.error('Failed to load reviewer dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviewerData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Reviewer Decision Studio</h1>
          <p className="text-sm text-slate-400">
            Human-in-the-loop dispute defense review. AI never auto-approves. All decisions require explicit Reviewer sign-off.
          </p>
        </div>
        <Link
          to="/reviewer/pending"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition"
        >
          <Layers className="w-4 h-4" />
          <span>Open Full Review Queue</span>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Pending Reviewer Sign-Off"
          value={`${metrics.pending} Disputes`}
          subtitle="Awaiting human review decision"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Approved & Transmitted"
          value={`${metrics.approved} Responses`}
          subtitle="Human-verified and submitted"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Rejected Responses"
          value={`${metrics.rejected} Cases`}
          subtitle="Returned for revision"
          icon={XCircle}
          color="rose"
        />
      </div>

      {/* Pending Review Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Pending Review Queue</h3>
            <p className="text-xs text-slate-400">LLM-drafted rebuttal letters awaiting Reviewer validation and sign-off</p>
          </div>
          <Link
            to="/reviewer/pending"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Loading review queue..." />
        ) : pendingDisputes.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/30 rounded-lg text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p>All dispute responses have been reviewed. Excellent work!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Dispute ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Defense Prob</th>
                  <th className="py-3 px-4">Evidence Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {pendingDisputes.map((cb) => (
                  <tr key={cb._id || cb.chargebackId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-purple-300">{cb.chargebackId}</td>
                    <td className="py-3 px-4 font-bold text-slate-100">${Number(cb.amount).toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{cb.disputeReason}</td>
                    <td className="py-3 px-4 font-bold text-purple-400">
                      {cb.defenseSuccessProbability !== null && cb.defenseSuccessProbability !== undefined
                        ? `${(cb.defenseSuccessProbability * 100).toFixed(1)}%`
                        : 'Pending'}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-400">
                      {cb.evidenceScore !== null && cb.evidenceScore !== undefined
                        ? `${cb.evidenceScore}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={cb.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/reviewer/chargebacks/${cb.chargebackId || cb._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded text-xs font-semibold transition"
                      >
                        <span>Review</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Recent Review History</h3>
            <p className="text-xs text-slate-400">Approved, rejected, and submitted dispute responses</p>
          </div>
          <Link
            to="/reviewer/history"
            className="text-xs font-semibold text-slate-400 hover:text-slate-300 flex items-center gap-1"
          >
            <span>Full History</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Loading history..." />
        ) : historyDisputes.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No review history yet.</div>
        ) : (
          <div className="space-y-2">
            {historyDisputes.map((cb) => (
              <div
                key={cb._id || cb.chargebackId}
                className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-slate-300">{cb.chargebackId}</span>
                  <span className="text-slate-400">${Number(cb.amount).toFixed(2)}</span>
                  <StatusBadge status={cb.reviewStatus || cb.status} />
                </div>
                <Link
                  to={`/reviewer/chargebacks/${cb.chargebackId || cb._id}`}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <span>View</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}