import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsService, transactionService, chargebackService } from '../../services/api';
import { StatCard } from '../../components/ui/ControlsAndStats';
import { RiskBadge, StatusBadge } from '../../components/ui/Badges';
import { LoadingState, ErrorState } from '../../components/ui/ModalsAndStates';
import { ShieldAlert, TrendingDown, DollarSign, ArrowUpRight, Scale, AlertTriangle, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function MerchantDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [recentDisputes, setRecentDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, txRes, cbRes] = await Promise.all([
        analyticsService.getMerchantAnalytics(),
        transactionService.getAll({ limit: 5 }),
        chargebackService.getAll({ limit: 5 })
      ]);

      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data.summary);
      }
      if (txRes.data.success) {
        setRecentTx(txRes.data.data);
      }
      if (cbRes.data.success) {
        setRecentDisputes(cbRes.data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load merchant overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Calculating merchant loss metrics and risk exposure..." />;
  if (error) return <ErrorState error={error} retry={loadData} />;

  const mockChartData = [
    { day: 'Mon', expectedLoss: 320, preventedLoss: 850 },
    { day: 'Tue', expectedLoss: 450, preventedLoss: 1200 },
    { day: 'Wed', expectedLoss: 210, preventedLoss: 940 },
    { day: 'Thu', expectedLoss: 580, preventedLoss: 1450 },
    { day: 'Fri', expectedLoss: 390, preventedLoss: 1100 },
    { day: 'Sat', expectedLoss: 180, preventedLoss: 620 },
    { day: 'Sun', expectedLoss: 290, preventedLoss: 890 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Merchant Risk & Loss Command Center</h1>
          <p className="text-sm text-slate-400">Live transaction monitoring, expected loss metrics, and dispute defense</p>
        </div>
        <Link
          to="/merchant/chargebacks"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <span>Manage Active Disputes</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 4 Core Financial Risk Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ingested Volume"
          value={`$${analytics?.totalVolume?.toLocaleString() || '0.00'}`}
          subtitle={`${analytics?.totalTransactions || 0} transactions processed`}
          icon={DollarSign}
          color="indigo"
        />
        <StatCard
          title="Expected Merchant Loss"
          value={`$${analytics?.totalExpectedLoss?.toLocaleString() || '0.00'}`}
          subtitle="Calculated: chargeback_prob * amount"
          icon={TrendingDown}
          color="rose"
        />
        <StatCard
          title="Open Chargeback Disputes"
          value={analytics?.openDisputes || 0}
          subtitle="Disputed transactions under defense"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Dispute Recovery Rate"
          value={`${analytics?.recoveryWinRatePercent || 0}%`}
          subtitle="Won disputes vs total chargebacks"
          icon={Scale}
          color="emerald"
        />
      </div>

      {/* Loss Trend Visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Weekly Loss Trend vs. Prevented Loss</h3>
            <p className="text-xs text-slate-400">Telemetry showing forecast risk mitigation</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-3 bg-rose-500 rounded-sm"></span>
              <span>Expected Loss</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
              <span>Prevented Loss</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="savedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="expectedLoss" stroke="#ef4444" fillOpacity={1} fill="url(#lossGrad)" />
              <Area type="monotone" dataKey="preventedLoss" stroke="#22c55e" fillOpacity={1} fill="url(#savedGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two columns: Recent High Risk & Recent Disputes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Recent Transactions</h3>
            <Link to="/merchant/transactions" className="text-xs font-semibold text-emerald-400 hover:underline">
              View All
            </Link>
          </div>
          {recentTx.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No transactions ingested yet.</p>
          ) : (
            <div className="space-y-3">
              {recentTx.map((tx) => (
                <div key={tx._id || tx.transactionId} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-700/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-200">{tx.transactionId}</span>
                      <RiskBadge level={tx.riskLevel} score={tx.riskScore} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Customer: {tx.customerId} • {tx.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-100">${Number(tx.amount).toFixed(2)}</span>
                    <p className="text-[10px] text-rose-400">Exp Loss: ${Number(tx.expectedLoss || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Disputes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Dispute Defense Queue</h3>
            <Link to="/merchant/chargebacks" className="text-xs font-semibold text-emerald-400 hover:underline">
              View All
            </Link>
          </div>
          {recentDisputes.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No active chargeback disputes logged.</p>
          ) : (
            <div className="space-y-3">
              {recentDisputes.map((cb) => (
                <div key={cb._id || cb.chargebackId} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-700/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-rose-400">{cb.chargebackId}</span>
                      <StatusBadge status={cb.status} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Reason: {cb.disputeReason}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-100">${Number(cb.amount).toFixed(2)}</span>
                    <span className="block text-[10px] text-purple-400">{cb.reviewStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
