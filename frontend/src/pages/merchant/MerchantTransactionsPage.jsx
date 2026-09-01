import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactionService } from '../../services/api';
import { SearchAndFilterBar, Pagination } from '../../components/ui/ControlsAndStats';
import { RiskBadge } from '../../components/ui/Badges';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/ModalsAndStates';
import { CreditCard, ArrowUpRight, ShieldAlert } from 'lucide-react';

export default function MerchantTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transactionService.getAll({
        page,
        limit: 10,
        search,
        riskLevel: riskFilter || undefined
      });
      if (res.data.success) {
        setTransactions(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, search, riskFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Transaction Stream & Risk Scoring</h1>
          <p className="text-sm text-slate-400">Real-time incoming transactions and expected merchant loss metrics</p>
        </div>
      </div>

      <SearchAndFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by transaction ID or customer ID..."
      >
        <select
          value={riskFilter}
          onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Risk Tiers</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </SearchAndFilterBar>

      {loading ? (
        <LoadingState message="Fetching transactions..." />
      ) : error ? (
        <ErrorState error={error} retry={fetchTransactions} />
      ) : transactions.length === 0 ? (
        <EmptyState title="No transactions found" message="Try adjusting your filters or search keywords." />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Customer ID</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Risk Score</th>
                  <th className="py-3.5 px-4">Risk Level</th>
                  <th className="py-3.5 px-4">Expected Loss</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {transactions.map((tx) => (
                  <tr key={tx._id || tx.transactionId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-100">{tx.transactionId}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{tx.customerId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">${Number(tx.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {tx.riskScore !== null && tx.riskScore !== undefined ? tx.riskScore : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={tx.riskLevel} score={tx.riskScore} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-400 font-semibold">
                      ${Number(tx.expectedLoss || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/merchant/transactions/${tx.transactionId || tx._id}`}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        <span>Details</span>
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
