import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Users,
  Store,
  Cpu,
  BarChart3,
  FileSpreadsheet,
  AlertTriangle,
  History,
  FileCheck2,
  Clock,
  LogOut,
  Menu,
  X,
  CreditCard
} from 'lucide-react';

export default function RoleLayout({ children }) {
  const { user, logout, getDashboardPath } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getNavItems = () => {
    switch (user?.role) {
      case 'ADMIN':
        return [
          { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'User Management', path: '/admin/users', icon: Users },
          { name: 'Merchants', path: '/admin/merchants', icon: Store },
          { name: 'ML Models & Registry', path: '/admin/models', icon: Cpu },
          { name: 'System Analytics', path: '/admin/analytics', icon: BarChart3 },
          { name: 'Audit Logs', path: '/admin/audit-logs', icon: History }
        ];
      case 'MERCHANT':
        return [
          { name: 'Dashboard', path: '/merchant/dashboard', icon: LayoutDashboard },
          { name: 'Transactions', path: '/merchant/transactions', icon: CreditCard },
          { name: 'Disputes & Chargebacks', path: '/merchant/chargebacks', icon: AlertTriangle },
          { name: 'Loss Analytics', path: '/merchant/loss-analytics', icon: BarChart3 }
        ];
      case 'RISK_ANALYST':
        return [
          { name: 'Analyst Dashboard', path: '/analyst/dashboard', icon: LayoutDashboard },
          { name: 'High-Risk Queue', path: '/analyst/risk-queue', icon: AlertTriangle },
          { name: 'Loss Analytics', path: '/merchant/loss-analytics', icon: BarChart3 }
        ];
      case 'REVIEWER':
        return [
          { name: 'Reviewer Studio', path: '/reviewer/dashboard', icon: LayoutDashboard },
          { name: 'Pending Rebuttals', path: '/reviewer/pending', icon: Clock },
          { name: 'Decision History', path: '/reviewer/history', icon: FileCheck2 }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-tight">AI Risk Manager</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-slate-100 rounded-lg"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-slate-900/95 border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen md:sticky md:top-0`}
      >
        {/* Brand */}
        <div className="hidden md:flex items-center space-x-3 px-6 h-16 border-b border-slate-800">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-100 tracking-tight leading-none">AI Risk Manager</div>
            <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">
              {user?.role || 'FINTECH'}
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 mx-3 my-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
          <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          {user?.merchantId && (
            <span className="inline-block mt-1 text-[10px] text-emerald-400 font-mono">
              ID: {user.merchantId}
            </span>
          )}
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
