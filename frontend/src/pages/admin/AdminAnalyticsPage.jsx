import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/api';
import { StatCard } from '../../components/ui/ControlsAndStats';
import { LoadingState, ErrorState } from '../../components/ui/ModalsAndStates';
import {
  Activity,
  ShieldAlert,
  Target,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: 12
};

const STATUS_COLORS = {
  OPEN: '#f59e0b',
  UNDER_REVIEW: '#3b82f6',
  RESPONSE_DRAFTED: '#6366f1',
  PENDING_REVIEW: '#a855f7',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  SUBMITTED: '#06b6d4',
  RESOLVED: '#10b981'
};

const REC_COLORS = {
  STRONG_DEFENSE: '#22c55e',
  REVIEW_REQUIRED: '#f59e0b',
  WEAK_DEFENSE: '#ef4444'
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

function EmptyChart({ message = 'No data available yet.' }) {
  return (
    <div className="flex items-center justify-center h-64 text-xs text-slate-500">
      {message}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getAdminPredictionAnalytics();
      if (res.data.success) {
        setData(res.data.data);
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

  if (loading) return <LoadingState message="Loading admin prediction analytics from MongoDB..." />;
  if (error) return <ErrorState error={error} retry={fetchAnalytics} />;
  if (!data) return <ErrorState error="No analytics data returned" />;

  const pred = data.predictionSummary || {};
  const highRisk = data.highRiskAnalysis || {};
  const cbOutcomes = data.chargebackOutcomes || [];
  const defOutcomes = data.defenseOutcomes || {};
  const dist = data.predictionDistribution || {};

  // Prepare chargeback outcome data for pie chart
  const cbPieData = cbOutcomes.map(c => ({ name: c.status, value: c.count }));
  const cbPieColors = cbOutcomes.map(c => STATUS_COLORS[c.status] || '#64748b');

  // Prepare defense outcome data for pie chart
  const defPieData = Object.entries(defOutcomes).map(([key, val]) => ({
    name: key || 'UNSCORED',
    value: val.count
  }));
  const defPieColors = Object.keys(defOutcomes).map(k => REC_COLORS[k] || '#64748b');

  // Model A probability distribution for bar chart
  const modelADistData = (dist.modelA || []).map(d => ({
    bucket: d.bucket,
    count: d.count,
    avgAmount: d.avgAmount
  }));

  // Model B probability distribution for bar chart
  const modelBDistData = (dist.modelB || []).map(d => ({
    bucket: d.bucket,
    count: d.count,
    avgScore: d.avgScore
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">System Prediction Analytics</h1>
        <p className="text-sm text-slate-400">
          Real-time prediction telemetry aggregated from MongoDB. All metrics sourced from actual inference records.
        </p>
      </div>

      {/* Row 1: Prediction Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Model A Predictions"
          value={(pred.totalModelAPredictions || 0).toLocaleString()}
          subtitle="Chargeback risk scoring records"
          icon={Target}
          color="indigo"
        />
        <StatCard
          title="Model B Predictions"
          value={(pred.totalModelBPredictions || 0).toLocaleString()}
          subtitle="Defense success prediction records"
          icon={ShieldAlert}
          color="purple"
        />
        <StatCard
          title="High-Risk Transactions"
          value={(highRisk.highRiskTransactions || 0).toLocaleString()}
          subtitle={`${highRisk.highRiskRate || 0}% of total (HIGH + CRITICAL)`}
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Critical Risk"
          value={(highRisk.criticalRiskTransactions || 0).toLocaleString()}
          subtitle="CRITICAL risk level transactions"
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Row 2: More Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transactions"
          value={(highRisk.totalTransactions || 0).toLocaleString()}
          subtitle="All ingested transactions"
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title="Scored Transactions"
          value={(highRisk.scoredTransactions || 0).toLocaleString()}
          subtitle="Transactions with ML risk scores"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Chargeback Cases"
          value={cbOutcomes.reduce((sum, c) => sum + c.count, 0).toLocaleString()}
          subtitle="Total dispute records"
          icon={ShieldAlert}
          color="rose"
        />
        <StatCard
          title="Defended Cases"
          value={Object.values(defOutcomes).reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          subtitle="Cases with Model B evaluation"
          icon={Layers}
          color="purple"
        />
      </div>

      {/* Chargeback Outcomes Table + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Chargeback Outcomes by Status" subtitle="Distribution of dispute case statuses with total disputed amounts">
          {cbOutcomes.length > 0 ? (
            <div className="space-y-3">
              {cbOutcomes.map(c => (
                <div key={c.status} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[c.status] || '#64748b' }} />
                    <div>
                      <span className="text-xs font-semibold text-slate-200">{c.status}</span>
                      <p className="text-[11px] text-slate-400">
                        {c.count} cases • ${c.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  {c.avgDefenseScore !== null && (
                    <span className="text-[11px] font-mono text-purple-400">Avg Def: {c.avgDefenseScore}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart message="No chargeback outcome data yet." />
          )}
        </ChartCard>

        <ChartCard title="Chargeback Status Distribution" subtitle="Pie chart of dispute case status breakdown">
          {cbPieData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cbPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {cbPieData.map((entry, i) => (
                      <Cell key={i} fill={cbPieColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No chargeback data for pie chart." />
          )}
        </ChartCard>
      </div>

      {/* Defense Outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Defense Recommendations" subtitle="Model B recommendation distribution (STRONG_DEFENSE, REVIEW_REQUIRED, WEAK_DEFENSE)">
          {defPieData.length > 0 ? (
            <div className="space-y-3">
              {defPieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: defPieColors[i] }} />
                    <span className="text-xs font-semibold text-slate-200">{d.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-300">{d.value} cases</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart message="No defense recommendation data yet." />
          )}
        </ChartCard>

        <ChartCard title="Defense Recommendation Distribution" subtitle="Pie chart of Model B defense outcomes">
          {defPieData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {defPieData.map((entry, i) => (
                      <Cell key={i} fill={defPieColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No defense data for pie chart." />
          )}
        </ChartCard>
      </div>

      {/* Prediction Probability Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Model A — Chargeback Probability Distribution" subtitle="Bucketed distribution of chargeback probability scores across all transactions">
          {modelADistData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelADistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="#6366f1" name="Transaction Count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No Model A prediction distribution data yet." />
          )}
        </ChartCard>

        <ChartCard title="Model B — Defense Probability Distribution" subtitle="Bucketed distribution of defense success probability scores across chargebacks">
          {modelBDistData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelBDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="#a855f7" name="Chargeback Count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No Model B prediction distribution data yet." />
          )}
        </ChartCard>
      </div>

      {/* Data Source Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 space-y-1">
          <p>
            <strong className="text-slate-200">Data Source:</strong> All analytics above are aggregated in real-time from MongoDB collections
            (Transactions, Chargebacks, Predictions). No hardcoded or fabricated metrics.
          </p>
          <p>
            <strong className="text-emerald-400">Prediction Records:</strong>{' '}
            Model A: {(pred.totalModelAPredictions || 0).toLocaleString()} records •{' '}
            Model B: {(pred.totalModelBPredictions || 0).toLocaleString()} records
          </p>
        </div>
      </div>
    </div>
  );
}
