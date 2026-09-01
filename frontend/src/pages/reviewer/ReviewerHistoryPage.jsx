import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chargebackService } from '../../services/api';
import { SearchAndFilterBar, Pagination } from '../../components/ui/ControlsAndStats';
import { StatusBadge } from '../../components/ui/Badges';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/ModalsAndStates';
import { ArrowUpRight, History } from 'lucide-react';

export default function ReviewerHistoryPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chargebackService.getAll({
        page,
        limit: 15,
        search
      });
      if (res.data.success) {
        const all = res.data.data || [];
        const history = all.filter((c) =>
          ['APPROVED', 'REJECTED', 'SUBMITTED', 'RESOLVED'].includes(c.status) ||
          ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(c.reviewStatus)
        );
        setDisputes(history);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="w-6 h-6 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Review Decision History</h1>
          <p className="text-sm text-slate-400">All past reviewer decisions: approvals, rejections, and change requests.</p>
        </div>
      </div>

      <SearchAndFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by case ID..."
      />

      {loading ? (
        <LoadingState message="Loading history..." />
      ) : error ? (
        <ErrorState error={error} retry={fetchHistory} />
      ) : disputes.length === 0 ? (
        <EmptyState title="No history" message="No reviewed disputes found." />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Dispute ID</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Dispute Status</th>
                  <th className="py-3.5 px-4">Review Status</th>
                  <th className="py-3.5 px-4">Reviewer Notes</th>
                  <th className="py-3.5 px-4">Reviewed At</th>
                  <th className="py-3.5 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {disputes.map((cb) => (
                  <tr key={cb._id || cb.chargebackId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-300">{cb.chargebackId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">${Number(cb.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={cb.status} /></td>
                    <td className="py-3.5 px-4"><StatusBadge status={cb.reviewStatus} /></td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{cb.reviewerNotes || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {cb.reviewedAt ? new Date(cb.reviewedAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/reviewer/chargebacks/${cb.chargebackId || cb._id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition"
                      >
                        <span>View</span>
                        <ArrowUpRight className="w-3 h-3" />
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