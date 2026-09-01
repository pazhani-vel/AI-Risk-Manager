import React, { useState } from 'react';
import { SearchAndFilterBar, StatCard } from '../../components/ui/ControlsAndStats';
import { StatusBadge } from '../../components/ui/Badges';
import { Modal } from '../../components/ui/ModalsAndStates';
import { Users, UserPlus, Shield, CheckCircle2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mockUsers = [
    { id: '1', name: 'System Admin', email: 'admin@airisk.io', role: 'ADMIN', status: 'ACTIVE', created: '2026-08-01' },
    { id: '2', name: 'Apex Merchant Team', email: 'risk@apexretail.com', role: 'MERCHANT', merchantId: 'MERCH-001', status: 'ACTIVE', created: '2026-08-05' },
    { id: '3', name: 'Dr. Sarah Lin', email: 'sarah.lin@airisk.io', role: 'RISK_ANALYST', status: 'ACTIVE', created: '2026-08-10' },
    { id: '4', name: 'Marcus Vance', email: 'm.vance@airisk.io', role: 'REVIEWER', status: 'ACTIVE', created: '2026-08-12' }
  ];

  const filtered = mockUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">User Access Management</h1>
          <p className="text-sm text-slate-400">Manage internal accounts and role-based permissions</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          Add Platform User
        </button>
      </div>

      <SearchAndFilterBar search={search} onSearchChange={setSearch} placeholder="Search by name, email, or role..." />

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4">Merchant Association</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-100">{u.name}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{u.merchantId || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-400">{u.created}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status="VERIFIED" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision New User Account">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
            <input type="text" required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
            <input type="email" required className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Role Assignment</label>
            <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100">
              <option value="ADMIN">ADMIN</option>
              <option value="MERCHANT">MERCHANT</option>
              <option value="RISK_ANALYST">RISK_ANALYST</option>
              <option value="REVIEWER">REVIEWER</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">Create Account</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
