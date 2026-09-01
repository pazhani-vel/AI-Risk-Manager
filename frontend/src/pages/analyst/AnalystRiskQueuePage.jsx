import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactionService } from '../../services/api';
import { StatCard, SearchAndFilterBar, Pagination } from '../../components/ui/ControlsAndStats';
import { RiskBadge, StatusBadge } from '../../components/ui/Badges';
import { LoadingState, EmptyState, ErrorState } from '../../components/ui/ModalsAndStates';
import {
  Flame,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownUp,
  Filter,
  Layers,
  DollarSign,
  TrendingUp,
  Search
} from 'lucide-react';

export default function AnalystRiskQueuePage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [sortBy, setSortBy] = useState('expectedLoss'); // 'expectedLoss', 'chargebackProbability', 'amount', 'riskScore'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transactionService.getAll({
        page,
        limit: 12,
        search,
        riskLevel: riskFilter || undefined,
        sortBy
      });

      if (res.data.success) {
        let list = res.data.data || [];
        // Client-side prioritized sort if backend returns generic sort
        list.sort((a, b) => {
          if (sortBy === 'expectedLoss') {
            return Number(b.expectedLoss || 0) - Number(a.expectedLoss || 0);
          } else if (sortBy === 'chargebackProbability') {
            return Number(b.chargebackProbability || 0) - Number(a.chargebackProbability || 0);
          } else if (sortBy === 'amount') {
            return Number(b.amount || 0) - Number(a.amount || 0);
          } else if (sortBy === 'riskScore') {
            return Number(b.riskScore || 0) - Number(a.riskScore || 0);
          }
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        setTransactions(list);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load analyst risk queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [page, search, riskFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">High-Risk Transaction Inspection Queue</h1>
          <p className="text-sm text-slate-400">
            Prioritized case review based on Expected Loss ($), Model A Chargeback Likelihood (%), and Velocity.
          </p>
        </div>
      </div>

      {/* Search & Prioritization Sorting Controls */}
      <SearchAndFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by transaction ID, customer ID, or payment method..."
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <ArrowDownUp className="w-3.5 h-3.5 text-purple-400" />
            <span>Prioritize By:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="expectedLoss">1. Expected Loss ($) (Highest First)</option>
            <option value="chargebackProbability">2. Chargeback Probability (%)</option>
            <option value="amount">3. Transaction Amount ($)</option>
            <option value="riskScore">4. Risk Score (0-100)</option>
          </select>
        </div>

        <select
          value={riskFilter}
          onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Risk Levels</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
      </SearchAndFilterBar>

      {loading ? (
        <LoadingState message="Ranking and prioritizing risk cases..." />
      ) : error ? (
        <ErrorState error={error} retry={fetchQueue} />
      ) : transactions.length === 0 ? (
        <EmptyState title="No matching transactions" message="No cases match your filter criteria in the risk queue." />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Customer ID</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Risk Score</th>
                  <th className="py-3.5 px-4">Chargeback Prob</th>
                  <th className="py-3.5 px-4">Expected Loss</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {transactions.map((tx, idx) => (
                  <tr key={tx._id || tx.transactionId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                      #{((page - 1) * 12) + idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      {tx.transactionId}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {tx.customerId}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">
                      ${Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={tx.riskLevel} score={tx.riskScore} />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      {tx.chargebackProbability !== null && tx.chargebackProbability !== undefined
                        ? `${(tx.chargebackProbability * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-400 font-bold text-sm">
                      ${Number(tx.expectedLoss || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={tx.status || 'COMPLETED'} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/analyst/transactions/${tx.transactionId || tx._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded text-xs font-semibold transition"
                      >
                        <span>Investigate</span>
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