import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chargebackService } from '../../services/api';
import { SearchAndFilterBar, Pagination } from '../../components/ui/ControlsAndStats';
import { StatusBadge } from '../../components/ui/Badges';
import { LoadingState, EmptyState, ErrorState, Modal } from '../../components/ui/ModalsAndStates';
import { AlertTriangle, Plus, ArrowUpRight, Scale } from 'lucide-react';

export default function MerchantChargebacksPage() {
  const [chargebacks, setChargebacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New dispute form
  const [newCb, setNewCb] = useState({
    chargebackId: '',
    transactionId: '',
    amount: '',
    disputeReason: 'FRAUDULENT_TRANSACTION'
  });

  const fetchChargebacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chargebackService.getAll({
        page,
        limit: 10,
        search,
        status: statusFilter || undefined
      });
      if (res.data.success) {
        setChargebacks(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch chargebacks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChargebacks();
  }, [page, search, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await chargebackService.create(newCb);
      setIsCreateOpen(false);
      setNewCb({ chargebackId: '', transactionId: '', amount: '', disputeReason: 'FRAUDULENT_TRANSACTION' });
      fetchChargebacks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create dispute');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Chargeback Disputes & Defense</h1>
          <p className="text-sm text-slate-400">Manage incoming dispute notices, upload evidence, and track win rates</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Log Incoming Dispute</span>
        </button>
      </div>

      <SearchAndFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by dispute ID, transaction ID, or reason..."
      >
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="DRAFTING">DRAFTING</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="WON">WON</option>
          <option value="LOST">LOST</option>
        </select>
      </SearchAndFilterBar>

      {loading ? (
        <LoadingState message="Fetching dispute defense records..." />
      ) : error ? (
        <ErrorState error={error} retry={fetchChargebacks} />
      ) : chargebacks.length === 0 ? (
        <EmptyState title="No chargebacks found" message="No active disputes recorded matching your search." />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Dispute ID</th>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Disputed Amount</th>
                  <th className="py-3.5 px-4">Dispute Reason</th>
                  <th className="py-3.5 px-4">Defense Probability</th>
                  <th className="py-3.5 px-4">Recommendation</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Review Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {chargebacks.map((cb) => (
                  <tr key={cb._id || cb.chargebackId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">{cb.chargebackId}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{cb.transactionId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">${Number(cb.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-slate-300">{cb.disputeReason}</td>
                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      {cb.defenseSuccessProbability !== null && cb.defenseSuccessProbability !== undefined
                        ? `${(cb.defenseSuccessProbability * 100).toFixed(1)}%`
                        : 'Pending Model B'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-xs text-slate-200">
                      {cb.recommendation || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={cb.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={cb.reviewStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/merchant/chargebacks/${cb.chargebackId || cb._id}`}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        <span>Defense Studio</span>
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

      {/* Create Dispute Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Log Incoming Chargeback Notice">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Dispute ID (ARN / Case ID)</label>
            <input
              type="text"
              required
              value={newCb.chargebackId}
              onChange={(e) => setNewCb({ ...newCb, chargebackId: e.target.value })}
              placeholder="e.g. CB-78901"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Associated Transaction ID</label>
            <input
              type="text"
              required
              value={newCb.transactionId}
              onChange={(e) => setNewCb({ ...newCb, transactionId: e.target.value })}
              placeholder="e.g. TX-9001"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Disputed Amount ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={newCb.amount}
              onChange={(e) => setNewCb({ ...newCb, amount: e.target.value })}
              placeholder="150.00"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Dispute Reason Code</label>
            <select
              value={newCb.disputeReason}
              onChange={(e) => setNewCb({ ...newCb, disputeReason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100"
            >
              <option value="FRAUDULENT_TRANSACTION">Fraudulent Transaction (No Cardholder Auth)</option>
              <option value="PRODUCT_NOT_RECEIVED">Product Not Received (10.4 / 4853)</option>
              <option value="PRODUCT_UNACCEPTABLE">Product Unacceptable / Defective</option>
              <option value="SUBSCRIPTION_CANCELLED">Subscription Cancelled Prior to Bill</option>
              <option value="UNRECOGNIZED_DESCRIPTOR">Unrecognized Merchant Name</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
            >
              Log Dispute
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
