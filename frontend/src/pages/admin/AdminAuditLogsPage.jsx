import React, { useState } from 'react';
import { SearchAndFilterBar } from '../../components/ui/ControlsAndStats';
import { StatusBadge } from '../../components/ui/Badges';
import { History, Shield, FileText } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');

  const mockLogs = [
    { id: '1', user: 'admin@airisk.io', role: 'ADMIN', action: 'USER_ROLE_UPDATED', entity: 'USER', entityId: 'user_401', timestamp: '2026-08-30 20:15:10' },
    { id: '2', user: 'risk@apexretail.com', role: 'MERCHANT', action: 'EVIDENCE_UPLOADED', entity: 'CHARGEBACK', entityId: 'CB-5001', timestamp: '2026-08-30 19:42:05' },
    { id: '3', user: 'm.vance@airisk.io', role: 'REVIEWER', action: 'DISPUTE_REBUTTAL_APPROVED', entity: 'CHARGEBACK', entityId: 'CB-5001', timestamp: '2026-08-30 19:10:33' },
    { id: '4', user: 'system', role: 'SYSTEM', action: 'TRANSACTION_INGESTED', entity: 'TRANSACTION', entityId: 'TX-9001', timestamp: '2026-08-30 18:30:00' }
  ];

  const filtered = mockLogs.filter(l =>
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.entityId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Audit & Compliance Trail</h1>
        <p className="text-sm text-slate-400">Immutable operational event logs across all merchant portfolios and internal roles</p>
      </div>

      <SearchAndFilterBar search={search} onSearchChange={setSearch} placeholder="Search by actor, action, or target entity ID..." />

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor Email</th>
                <th className="py-3.5 px-4">Actor Role</th>
                <th className="py-3.5 px-4">Action Performed</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Target ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 text-slate-400 font-mono">{l.timestamp}</td>
                  <td className="py-3.5 px-4 text-slate-200 font-medium">{l.user}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                      {l.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-amber-400">{l.action}</td>
                  <td className="py-3.5 px-4 text-slate-300">{l.entity}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{l.entityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
