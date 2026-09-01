import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/api';
import { StatCard } from '../../components/ui/ControlsAndStats';
import { LoadingState, ErrorState } from '../../components/ui/ModalsAndStates';
import {
  TrendingDown,
  DollarSign,
  Percent,
  AlertTriangle,
  Shield,
  ArrowDownRight,
  ArrowUpRight,
  FileWarning,
  CheckCircle2,
  Ban,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: 12
};

const RISK_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
  UNSCORED: '#64748b'
};

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message = 'No data available for this chart yet.' }) {
  return (
    <div className="flex items-center justify-center h-64 text-xs text-slate-500">
      {message}
    </div>
  );
}

export default function LossAnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getLossSummary();
      if (res.data.success) {
        setSummary(res.data.data.summary);
        setCharts(res.data.data.charts);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingState message="Aggregating merchant loss telemetry from MongoDB..." />;
  if (error) return <ErrorState error={error} retry={fetchAnalytics} />;
  if (!summary) return <ErrorState error="No analytics data returned" />;

  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Merchant Loss Analytics</h1>
        <p className="text-sm text-slate-400">
          Comprehensive loss telemetry computed from real MongoDB data.
          <span className="text-amber-400 ml-1 font-medium">Expected loss = sum(chargeback_probability x transaction_amount)</span> — distinct from actual disputed and recovered amounts.
        </p>
      </div>

      {/* Row 1: Transaction Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transactions"
          value={summary.totalTransactions.toLocaleString()}
          subtitle="Ingested transactions"
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="Total Transaction Value"
          value={`$${fmt(summary.totalTransactionValue)}`}
          subtitle="Aggregate transaction volume"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="High-Risk Transactions"
          value={summary.highRiskTransactions.toLocaleString()}
          subtitle="HIGH + CRITICAL risk level"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Chargeback Rate"
          value={`${summary.chargebackRate}%`}
          subtitle="Chargebacks / Total transactions"
          icon={Percent}
          color="rose"
        />
      </div>

      {/* Row 2: Chargeback & Defense Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Chargebacks"
          value={summary.totalChargebacks.toLocaleString()}
          subtitle="Dispute cases filed"
          icon={FileWarning}
          color="rose"
        />
        <StatCard
          title="Defended Cases"
          value={summary.defendedCases.toLocaleString()}
          subtitle="Cases with Model B prediction"
          icon={Shield}
          color="purple"
        />
        <StatCard
          title="Successful Defense Rate"
          value={`${summary.successfulDefenseRate}%`}
          subtitle="Approved + submitted / defended"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Unresolved Amount"
          value={`$${fmt(summary.unresolvedAmount)}`}
          subtitle="Open + pending + rejected disputes"
          icon={Ban}
          color="amber"
        />
      </div>

      {/* Row 3: Financial Impact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Predicted Loss (Expected)"
          value={`$${fmt(summary.expectedLoss)}`}
          subtitle="Model A: sum(prob x amount)"
          icon={TrendingDown}
          color="rose"
        />
        <StatCard
          title="Potential Loss Exposure"
          value={`$${fmt(summary.potentialLoss)}`}
          subtitle="Raw probability-weighted total"
          icon={ArrowDownRight}
          color="amber"
        />
        <StatCard
          title="Disputed Amount"
          value={`$${fmt(summary.disputedAmount)}`}
          subtitle="Actual chargeback $ at risk"
          icon={FileWarning}
          color="indigo"
        />
        <StatCard
          title="Recovered Amount"
          value={`$${fmt(summary.recoveredAmount)}`}
          subtitle="Won + approved + submitted"
          icon={ArrowUpRight}
          color="emerald"
        />
      </div>

      {/* Loss Metric Clarity Callout */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 space-y-1">
          <p>
            <strong className="text-slate-200">Loss Metric Clarity:</strong> Expected Loss is a predictive metric
            computed by Model A as <code className="text-amber-300 bg-slate-800 px-1 rounded">sum(chargeback_probability x transaction_amount)</code>.
            It is <em>not</em> the same as Actual Loss (disputed amount) or Recovered Amount (funds reclaimed through successful defense).
          </p>
          <p>
            <strong className="text-emerald-400">Predicted Loss</strong> vs{' '}
            <strong className="text-slate-300">Actual Loss (Disputed)</strong> vs{' '}
            <strong className="text-emerald-300">Recovered Amount</strong> — three distinct financial metrics tracked separately.
          </p>
        </div>
      </div>

      {/* Chart 1: Transactions Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Transactions Over Time" subtitle="Monthly transaction count and volume">
          {charts?.transactionsOverTime?.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.transactionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} angle={-30} textAnchor="end" height={50} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="count" fill="#6366f1" name="Count" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="value" fill="#22c55e" name="Value ($)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        {/* Chart 2: Chargebacks Over Time */}
        <ChartCard title="Chargebacks Over Time" subtitle="Monthly dispute count and disputed amount">
          {charts?.chargebacksOverTime?.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.chargebacksOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} angle={-30} textAnchor="end" height={50} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="count" fill="#ef4444" name="Count" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="amount" fill="#f97316" name="Amount ($)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No chargeback data yet." />
          )}
        </ChartCard>
      </div>

      {/* Chart 3: Expected Loss Over Time */}
      <ChartCard title="Expected Loss Over Time" subtitle="Monthly predicted loss (Model A: sum of probability x amount). This is NOT actual loss.">
        {charts?.expectedLossOverTime?.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.expectedLossOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="period" stroke="#64748b" fontSize={11} angle={-30} textAnchor="end" height={50} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="expectedLoss" stroke="#ef4444" strokeWidth={2} name="Expected Loss ($)" dot={{ fill: '#ef4444', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No expected loss data yet. Run Model A on transactions first." />
        )}
      </ChartCard>

      {/* Chart 4 & 5: Chargeback Rate + Defense Success Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Chargeback Rate Over Time" subtitle="Monthly chargeback rate (%) = chargebacks / transactions">
          {charts?.chargebackRateOverTime?.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.chargebackRateOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} angle={-30} textAnchor="end" height={50} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2} name="Rate (%)" dot={{ fill: '#f59e0b', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No chargeback rate data yet." />
          )}
        </ChartCard>

        <ChartCard title="Defense Success Rate Over Time" subtitle="Monthly rate of successful defenses (approved + submitted / defended)">
          {charts?.defenseSuccessRateOverTime?.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.defenseSuccessRateOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={11} angle={-30} textAnchor="end" height={50} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2} name="Success Rate (%)" dot={{ fill: '#22c55e', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No defense success data yet. Run Model B on chargebacks first." />
          )}
        </ChartCard>
      </div>

      {/* Chart 6 & 7: Loss by Dispute Reason + Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Loss by Dispute Reason" subtitle="Total disputed amount grouped by dispute reason code">
          {charts?.lossByDisputeReason?.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.lossByDisputeReason} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="reason" stroke="#64748b" fontSize={11} width={140} tickFormatter={(v) => (v?.length > 18 ? v.slice(0, 18) + '...' : v)} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => { if (name === 'totalAmount') return [`$${fmt(value)}`, 'Disputed Amount']; return [value, name]; }} />
                  <Bar dataKey="totalAmount" fill="#6366f1" name="Disputed Amount" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No dispute reason data yet." />
          )}
        </ChartCard>

        <ChartCard title="Risk-Level Distribution" subtitle="Transaction count, volume, and expected loss by risk tier">
          {charts?.riskLevelDistribution?.length > 0 ? (
            <div className="space-y-4">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.riskLevelDistribution} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={85} innerRadius={40} paddingAngle={2} label={({ level, percent }) => `${level} ${(percent * 100).toFixed(0)}%`}>
                      {charts.riskLevelDistribution.map((entry) => (
                        <Cell key={entry.level} fill={RISK_COLORS[entry.level] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [value, name === 'count' ? 'Transactions' : name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="text-left py-2 px-2 font-semibold">Level</th>
                      <th className="text-right py-2 px-2 font-semibold">Count</th>
                      <th className="text-right py-2 px-2 font-semibold">Volume</th>
                      <th className="text-right py-2 px-2 font-semibold">Exp. Loss</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {charts.riskLevelDistribution.map((row) => (
                      <tr key={row.level} className="border-b border-slate-800/50">
                        <td className="py-2 px-2 font-medium">
                          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: RISK_COLORS[row.level] || '#64748b' }} />
                          {row.level}
                        </td>
                        <td className="py-2 px-2 text-right">{row.count.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">${fmt(row.volume)}</td>
                        <td className="py-2 px-2 text-right text-amber-400">${fmt(row.expectedLoss)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyChart message="No risk distribution data yet." />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
