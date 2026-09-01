import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chargebackService } from '../../services/api';
import { SearchAndFilterBar, Pagination } from '../../components/ui/ControlsAndStats';
import { StatusBadge } from '../../components/ui/Badges';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/ModalsAndStates';
import { ArrowUpRight, Filter, Clock } from 'lucide-react';

export default function ReviewerPendingPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chargebackService.getAll({
        page,
        limit: 12,
        search,
        status: statusFilter || undefined
      });
      if (res.data.success) {
        setDisputes(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load pending review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [page, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Review Queue</h1>
        <p className="text-sm text-slate-400">
          Dispute responses pending human sign-off. AI never auto-approves — all decisions require explicit reviewer action.
        </p>
      </div>

      <SearchAndFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by case ID or transaction ID..."
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="UNDER_REVIEW">Changes Requested</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="">All</option>
          </select>
        </div>
      </SearchAndFilterBar>

      {loading ? (
        <LoadingState message="Loading review queue..." />
      ) : error ? (
        <ErrorState error={error} retry={fetchDisputes} />
      ) : disputes.length === 0 ? (
        <EmptyState title="No disputes found" message="No disputes match your filter criteria." />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Dispute ID</th>
                  <th className="py-3.5 px-4">Transaction Ref</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Defense Prob</th>
                  <th className="py-3.5 px-4">Evidence Score</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {disputes.map((cb) => (
                  <tr key={cb._id || cb.chargebackId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-300">{cb.chargebackId}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{cb.transactionId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">${Number(cb.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">{cb.disputeReason}</td>
                    <td className="py-3.5 px-4 font-bold text-purple-400">
                      {cb.defenseSuccessProbability !== null && cb.defenseSuccessProbability !== undefined
                        ? `${(cb.defenseSuccessProbability * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      {cb.evidenceScore !== null && cb.evidenceScore !== undefined ? `${cb.evidenceScore}%` : '—'}
                    </td>
                    <td className="py-3.5 px-4"><StatusBadge status={cb.status} /></td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/reviewer/chargebacks/${cb.chargebackId || cb._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded text-xs font-semibold transition"
                      >
                        <span>Review Now</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}