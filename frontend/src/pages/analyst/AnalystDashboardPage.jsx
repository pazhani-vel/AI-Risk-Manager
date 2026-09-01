import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactionService, chargebackService } from '../../services/api';
import { StatCard } from '../../components/ui/ControlsAndStats';
import { RiskBadge, StatusBadge } from '../../components/ui/Badges';
import { LoadingState, EmptyState } from '../../components/ui/ModalsAndStates';
import {
  ShieldAlert,
  Cpu,
  ArrowUpRight,
  Flame,
  Layers,
  TrendingDown,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function AnalystDashboardPage() {
  const [highRiskTx, setHighRiskTx] = useState([]);
  const [activeChargebacks, setActiveChargebacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    criticalCount: 0,
    totalExpectedLoss: 0,
    highVelocityAlerts: 0,
    openDisputes: 0
  });

  useEffect(() => {
    const fetchAnalystData = async () => {
      setLoading(true);
      try {
        const [txRes, cbRes] = await Promise.all([
          transactionService.getAll({ limit: 8 }),
          chargebackService.getAll({ limit: 5 })
        ]);

        if (txRes.data.success) {
          const allTx = txRes.data.data || [];
          const sortedByLoss = [...allTx].sort(
            (a, b) => Number(b.expectedLoss || 0) - Number(a.expectedLoss || 0)
          );
          setHighRiskTx(sortedByLoss);

          const critical = allTx.filter((t) => t.riskLevel === 'CRITICAL' || t.riskScore >= 80).length;
          const totalLoss = allTx.reduce((sum, t) => sum + Number(t.expectedLoss || 0), 0);
          const velocity = allTx.filter((t) => t.ordersLast24h >= 3 || t.multipleAccountsSameDevice).length;

          setMetrics((prev) => ({
            ...prev,
            criticalCount: critical,
            totalExpectedLoss: totalLoss,
            highVelocityAlerts: velocity
          }));
        }

        if (cbRes.data.success) {
          const cbs = cbRes.data.data || [];
          setActiveChargebacks(cbs);
          setMetrics((prev) => ({
            ...prev,
            openDisputes: cbs.filter((c) => c.status === 'OPEN' || c.status === 'UNDER_REVIEW').length
          }));
        }
      } catch (err) {
        console.error('Failed to load analyst telemetry:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalystData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Risk Analyst Intelligence Hub</h1>
          <p className="text-sm text-slate-400">
            Model A anomaly detection, Expected Loss prioritization, and Model B dispute investigation.
          </p>
        </div>
        <Link
          to="/analyst/risk-queue"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition"
        >
          <Layers className="w-4 h-4" />
          <span>Open Full Risk Queue</span>
        </Link>
      </div>

      {/* Executive Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Critical Risk Transactions"
          value={`${metrics.criticalCount} Flagged`}
          subtitle="Risk score ≥ 80 / CRITICAL"
          icon={Flame}
          color="rose"
        />
        <StatCard
          title="Total Expected Loss"
          value={`$${metrics.totalExpectedLoss.toFixed(2)}`}
          subtitle="Aggregated model exposure"
          icon={TrendingDown}
          color="amber"
        />
        <StatCard
          title="High Velocity / Device Anomalies"
          value={`${metrics.highVelocityAlerts} Alerts`}
          subtitle="Multi-account / rapid spikes"
          icon={ShieldAlert}
          color="blue"
        />
        <StatCard
          title="Active Dispute Cases"
          value={`${metrics.openDisputes} In Review`}
          subtitle="Model B recovery candidates"
          icon={Scale}
          color="purple"
        />
      </div>

      {/* High-Risk Queue Quick Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Top Priority Transactions by Expected Loss</h3>
            <p className="text-xs text-slate-400">Automated Model A loss ranking</p>
          </div>
          <Link
            to="/analyst/risk-queue"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Loading prioritized queue..." />
        ) : highRiskTx.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/30 rounded-lg text-xs text-slate-400">
            No high-risk transactions detected.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Customer ID</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Risk Level</th>
                  <th className="py-3.5 px-4">Chargeback Prob</th>
                  <th className="py-3.5 px-4">Expected Loss</th>
                  <th className="py-3.5 px-4 text-right">Investigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {highRiskTx.slice(0, 6).map((tx) => (
                  <tr key={tx._id || tx.transactionId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">{tx.transactionId}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{tx.customerId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">${Number(tx.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={tx.riskLevel} score={tx.riskScore} />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      {tx.chargebackProbability !== null && tx.chargebackProbability !== undefined
                        ? `${(tx.chargebackProbability * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-400 font-bold">
                      ${Number(tx.expectedLoss || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/analyst/transactions/${tx.transactionId || tx._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded text-xs font-semibold transition"
                      >
                        <span>Inspect</span>
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

      {/* Active Chargeback Investigations Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Active Chargeback Disputes Requiring Evidence & Defense</h3>
            <p className="text-xs text-slate-400">Attach verified evidence and trigger Model B defense intelligence</p>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading disputes..." />
        ) : activeChargebacks.length === 0 ? (
          <div className="p-6 text-center bg-slate-800/30 rounded-lg text-xs text-slate-400">
            No active dispute cases.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Dispute ID</th>
                  <th className="py-3.5 px-4">Transaction Ref</th>
                  <th className="py-3.5 px-4">Disputed Amount</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Defense Prob</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Defense Studio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {activeChargebacks.map((cb) => (
                  <tr key={cb._id || cb.chargebackId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-400">{cb.chargebackId}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{cb.transactionId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">${Number(cb.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-slate-300">{cb.disputeReason}</td>
                    <td className="py-3.5 px-4 font-bold text-purple-400">
                      {cb.defenseSuccessProbability !== null && cb.defenseSuccessProbability !== undefined
                        ? `${(cb.defenseSuccessProbability * 100).toFixed(1)}%`
                        : 'Pending'}
                    </td>
                    <td className="py-3.5 px-4"><StatusBadge status={cb.status} /></td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/analyst/chargebacks/${cb.chargebackId || cb._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded text-xs font-semibold transition"
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
        )}
      </div>
    </div>
  );
}