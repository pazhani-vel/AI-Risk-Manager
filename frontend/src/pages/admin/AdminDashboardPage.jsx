import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/api';
import { StatCard } from '../../components/ui/ControlsAndStats';
import { LoadingState, ErrorState } from '../../components/ui/ModalsAndStates';
import { Users, Store, ShieldAlert, Cpu, BarChart2, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getAdminAnalytics();
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch admin metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading system metrics..." />;
  if (error) return <ErrorState error={error} retry={fetchData} />;

  const systemOverview = data?.systemOverview || {};
  const userDist = systemOverview.userDistribution || {};

  const riskDistData = data?.riskDistribution?.map(d => ({
    name: d._id || 'UNSCORING',
    count: d.count,
    expectedLoss: d.expectedLoss
  })) || [
    { name: 'LOW', count: 12, expectedLoss: 450 },
    { name: 'MEDIUM', count: 5, expectedLoss: 890 },
    { name: 'HIGH', count: 3, expectedLoss: 1200 },
    { name: 'CRITICAL', count: 1, expectedLoss: 650 }
  ];

  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#64748b'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Global Admin Console</h1>
        <p className="text-sm text-slate-400">Platform-wide risk telemetry, role distribution, and model metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transactions"
          value={systemOverview.totalTransactions || 0}
          subtitle="Processed across all merchants"
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="Total Chargebacks"
          value={systemOverview.totalChargebacks || 0}
          subtitle="Recorded dispute notices"
          icon={ShieldAlert}
          color="rose"
        />
        <StatCard
          title="Active Users"
          value={Object.values(userDist).reduce((a, b) => a + b, 0)}
          subtitle="Admin, Merchant & Reviewer accounts"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Active ML Models"
          value="2 Models"
          subtitle="Model A (Risk) & Model B (Defense)"
          icon={Cpu}
          color="purple"
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Transaction Loss by Risk Tier</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="expectedLoss" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {riskDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Role Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Internal User Roles Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(userDist).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
                <span className="text-xs font-semibold text-slate-300 uppercase">{role}</span>
                <span className="text-xs font-bold text-emerald-400">{count} accounts</span>
              </div>
            ))}
            {Object.keys(userDist).length === 0 && (
              <p className="text-xs text-slate-400">No user data recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
