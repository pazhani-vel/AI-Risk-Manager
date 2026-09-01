import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const customerService = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data)
};

export const transactionService = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  predictRisk: (id) => api.post(`/transactions/${id}/predict-risk`)
};

export const chargebackService = {
  getAll: (params) => api.get('/chargebacks', { params }),
  getById: (id) => api.get(`/chargebacks/${id}`),
  create: (data) => api.post('/chargebacks', data),
  update: (id, data) => api.put(`/chargebacks/${id}`, data),
  predictDefense: (id) => api.post(`/chargebacks/${id}/predict-defense`),
  generateResponse: (id) => api.post(`/chargebacks/${id}/generate-response`),
  review: (id, action, reviewerNotes) => api.post(`/chargebacks/${id}/review`, { action, reviewerNotes }),
  updateStatus: (id, status) => api.patch(`/chargebacks/${id}/status`, { status }),
  getEvidence: (id) => api.get(`/chargebacks/${id}/evidence`),
  createEvidence: (id, data) => api.post(`/chargebacks/${id}/evidence`, data)
};

export const evidenceService = {
  update: (id, data) => api.put(`/evidence/${id}`, data),
  delete: (id) => api.delete(`/evidence/${id}`)
};

export const analyticsService = {
  getLossSummary: (params) => api.get('/analytics/loss-summary', { params }),
  getMerchantAnalytics: (params) => api.get('/analytics/merchant', { params }),
  getAdminAnalytics: () => api.get('/analytics/admin'),
  getModelMetrics: () => api.get('/analytics/model-metrics'),
  getAdminPredictionAnalytics: () => api.get('/analytics/admin/predictions')
};

export default api;
