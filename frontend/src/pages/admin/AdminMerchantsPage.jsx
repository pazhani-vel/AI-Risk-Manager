import React, { useState } from 'react';
import { SearchAndFilterBar, StatCard } from '../../components/ui/ControlsAndStats';
import { StatusBadge, RiskBadge } from '../../components/ui/Badges';
import { Store, ShieldCheck, DollarSign } from 'lucide-react';

export default function AdminMerchantsPage() {
  const [search, setSearch] = useState('');

  const mockMerchants = [
    { id: '1', merchantId: 'MERCH-001', name: 'Apex Retail Group', category: 'Luxury Apparel', riskTier: 'LOW', volume: '$1.42M', disputes: 4, status: 'VERIFIED' },
    { id: '2', merchantId: 'MERCH-002', name: 'Nova Electronics Store', category: 'Consumer Tech', riskTier: 'MEDIUM', volume: '$890K', disputes: 12, status: 'VERIFIED' },
    { id: '3', merchantId: 'MERCH-003', name: 'Global Digital Vouchers', category: 'Digital Goods', riskTier: 'HIGH', volume: '$340K', disputes: 29, status: 'UNVERIFIED' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Merchant Directory</h1>
        <p className="text-sm text-slate-400">Onboarded merchant portfolios, assigned risk tiers, and exposure levels</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Active Merchants" value="3 Merchants" subtitle="Across 3 commerce verticals" icon={Store} color="emerald" />
        <StatCard title="Aggregate Volume" value="$2.65M" subtitle="Ingested transaction volume" icon={DollarSign} color="indigo" />
        <StatCard title="High-Risk Merchants" value="1 Merchant" subtitle="Subject to manual defense review" icon={ShieldCheck} color="amber" />
      </div>

      <SearchAndFilterBar search={search} onSearchChange={setSearch} placeholder="Search merchants by ID, name, or industry..." />

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Merchant ID</th>
                <th className="py-3.5 px-4">Company Name</th>
                <th className="py-3.5 px-4">Business Category</th>
                <th className="py-3.5 px-4">Assigned Risk Tier</th>
                <th className="py-3.5 px-4">Total Ingested Volume</th>
                <th className="py-3.5 px-4">Open Chargebacks</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {mockMerchants.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-medium">{m.merchantId}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100">{m.name}</td>
                  <td className="py-3.5 px-4 text-slate-300">{m.category}</td>
                  <td className="py-3.5 px-4">
                    <RiskBadge level={m.riskTier} />
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100">{m.volume}</td>
                  <td className="py-3.5 px-4 text-rose-400 font-bold">{m.disputes}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
