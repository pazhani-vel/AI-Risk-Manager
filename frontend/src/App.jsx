import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleLayout from './components/layout/RoleLayout';

// Base Pages
import LoginPage from './pages/LoginPage';
import StatusPage from './pages/StatusPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminMerchantsPage from './pages/admin/AdminMerchantsPage';
import AdminModelsPage from './pages/admin/AdminModelsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';

// Merchant Pages
import MerchantDashboardPage from './pages/merchant/MerchantDashboardPage';
import MerchantTransactionsPage from './pages/merchant/MerchantTransactionsPage';
import TransactionDetailPage from './pages/merchant/TransactionDetailPage';
import MerchantChargebacksPage from './pages/merchant/MerchantChargebacksPage';
import DisputeDefenseStudioPage from './pages/merchant/DisputeDefenseStudioPage';
import LossAnalyticsPage from './pages/merchant/LossAnalyticsPage';

// Analyst Pages
import AnalystDashboardPage from './pages/analyst/AnalystDashboardPage';
import AnalystRiskQueuePage from './pages/analyst/AnalystRiskQueuePage';

// Reviewer Pages
import ReviewerDashboardPage from './pages/reviewer/ReviewerDashboardPage';
import ReviewerPendingPage from './pages/reviewer/ReviewerPendingPage';
import ReviewerChargebackDetailPage from './pages/reviewer/ReviewerChargebackDetailPage';
import ReviewerHistoryPage from './pages/reviewer/ReviewerHistoryPage';

export default function App() {
  const { user, isAuthenticated, getDashboardPath } = useAuth();

  return (
    <Routes>
      {/* Public Pages */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardPath(user?.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/status" element={<StatusPage />} />

      {/* ADMIN ROUTES */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <RoleLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="merchants" element={<AdminMerchantsPage />} />
                <Route path="models" element={<AdminModelsPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="audit-logs" element={<AdminAuditLogsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </RoleLayout>
          </ProtectedRoute>
        }
      />

      {/* MERCHANT ROUTES */}
      <Route
        path="/merchant/*"
        element={
          <ProtectedRoute allowedRoles={['MERCHANT', 'ADMIN']}>
            <RoleLayout>
              <Routes>
                <Route path="dashboard" element={<MerchantDashboardPage />} />
                <Route path="transactions" element={<MerchantTransactionsPage />} />
                <Route path="transactions/:id" element={<TransactionDetailPage />} />
                <Route path="chargebacks" element={<MerchantChargebacksPage />} />
                <Route path="chargebacks/:id" element={<DisputeDefenseStudioPage />} />
                <Route path="loss-analytics" element={<LossAnalyticsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </RoleLayout>
          </ProtectedRoute>
        }
      />

      {/* ANALYST ROUTES */}
      <Route
        path="/analyst/*"
        element={
          <ProtectedRoute allowedRoles={['RISK_ANALYST', 'ADMIN']}>
            <RoleLayout>
              <Routes>
                <Route path="dashboard" element={<AnalystDashboardPage />} />
                <Route path="risk-queue" element={<AnalystRiskQueuePage />} />
                <Route path="transactions/:id" element={<TransactionDetailPage />} />
                <Route path="chargebacks/:id" element={<DisputeDefenseStudioPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </RoleLayout>
          </ProtectedRoute>
        }
      />

      {/* REVIEWER ROUTES */}
      <Route
        path="/reviewer/*"
        element={
          <ProtectedRoute allowedRoles={['REVIEWER', 'ADMIN']}>
            <RoleLayout>
              <Routes>
                <Route path="dashboard" element={<ReviewerDashboardPage />} />
                <Route path="pending" element={<ReviewerPendingPage />} />
                <Route path="chargebacks/:id" element={<ReviewerChargebackDetailPage />} />
                <Route path="history" element={<ReviewerHistoryPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </RoleLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
