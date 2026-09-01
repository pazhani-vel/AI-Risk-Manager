import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { User, UserRole } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Transaction } from '../src/models/Transaction.js';
import { Chargeback } from '../src/models/Chargeback.js';
import { Evidence } from '../src/models/Evidence.js';
import { AuditLog } from '../src/models/AuditLog.js';

// In-memory data structures to mock Mongoose models for standalone testing
const memoryStore = {
  users: new Map(),
  customers: new Map(),
  transactions: new Map(),
  chargebacks: new Map(),
  evidence: new Map(),
  auditLogs: []
};

// Mock User
User.findOne = (query) => {
  const queryEmail = query?.email;
  const user = Array.from(memoryStore.users.values()).find(u => u.email === queryEmail);
  return {
    select: () => Promise.resolve(user ? { ...user, comparePassword: async (pwd) => bcrypt.compare(pwd, user.passwordHash) } : null),
    then: (resolve) => resolve(user ? { ...user, comparePassword: async (pwd) => bcrypt.compare(pwd, user.passwordHash) } : null)
  };
};

User.findById = (id) => {
  const user = memoryStore.users.get(String(id));
  return {
    select: () => Promise.resolve(user ? { ...user } : null),
    then: (resolve) => Promise.resolve(user ? { ...user } : null)
  };
};

User.create = async (data) => {
  const _id = 'user_' + Math.random().toString(36).substring(2, 9);
  const record = { _id, ...data, isActive: true, createdAt: new Date(), updatedAt: new Date() };
  memoryStore.users.set(_id, record);
  return record;
};

User.aggregate = async () => [
  { _id: 'ADMIN', count: 1 },
  { _id: 'MERCHANT', count: 1 }
];

// Mock Customer
Customer.find = (query) => {
  let list = Array.from(memoryStore.customers.values());
  if (query?.merchantId) list = list.filter(c => c.merchantId === query.merchantId);
  return {
    sort: () => ({
      skip: () => ({
        limit: () => Promise.resolve(list)
      })
    })
  };
};
Customer.countDocuments = async (query) => {
  let list = Array.from(memoryStore.customers.values());
  if (query?.merchantId) list = list.filter(c => c.merchantId === query.merchantId);
  return list.length;
};
Customer.findOne = async (query) => {
  if (query?.$or) {
    for (const cond of query.$or) {
      if (cond.customerId) {
        const found = Array.from(memoryStore.customers.values()).find(c => c.customerId === cond.customerId);
        if (found) return found;
      }
      if (cond._id) {
        const found = memoryStore.customers.get(String(cond._id));
        if (found) return found;
      }
    }
  }
  if (query?.customerId) {
    return Array.from(memoryStore.customers.values()).find(c => c.customerId === query.customerId) || null;
  }
  return null;
};
Customer.create = async (data) => {
  const _id = 'cust_id_' + Math.random().toString(36).substring(2, 9);
  const record = { _id, ...data, createdAt: new Date(), updatedAt: new Date() };
  memoryStore.customers.set(_id, record);
  return record;
};

// Mock Transaction
Transaction.find = (query) => {
  let list = Array.from(memoryStore.transactions.values());
  if (query?.merchantId) list = list.filter(t => t.merchantId === query.merchantId);
  if (query?.riskLevel) list = list.filter(t => t.riskLevel === query.riskLevel);
  return {
    sort: () => ({
      skip: () => ({
        limit: () => Promise.resolve(list)
      })
    })
  };
};
Transaction.countDocuments = async (query) => {
  let list = Array.from(memoryStore.transactions.values());
  if (query?.merchantId) list = list.filter(t => t.merchantId === query.merchantId);
  if (query?.riskLevel) {
    if (query.riskLevel.$in) {
      list = list.filter(t => query.riskLevel.$in.includes(t.riskLevel));
    } else {
      list = list.filter(t => t.riskLevel === query.riskLevel);
    }
  }
  return list.length;
};
Transaction.findOne = async (query) => {
  if (query?.$or) {
    for (const cond of query.$or) {
      if (cond.transactionId) {
        const found = Array.from(memoryStore.transactions.values()).find(t => t.transactionId === cond.transactionId);
        if (found) return found;
      }
      if (cond._id) {
        const found = memoryStore.transactions.get(String(cond._id));
        if (found) return found;
      }
    }
  }
  if (query?.transactionId) {
    return Array.from(memoryStore.transactions.values()).find(t => t.transactionId === query.transactionId) || null;
  }
  return null;
};
Transaction.create = async (data) => {
  const _id = 'tx_' + Math.random().toString(36).substring(2, 9);
  const record = {
    _id,
    ...data,
    save: async function() {
      memoryStore.transactions.set(_id, this);
      return this;
    }
  };
  memoryStore.transactions.set(_id, record);
  return record;
};
Transaction.aggregate = async () => [
  { _id: null, totalVolume: 1250.00, totalExpectedLoss: 85.00, avgRiskScore: 35.0 }
];

// Mock Chargeback
Chargeback.find = (query) => {
  let list = Array.from(memoryStore.chargebacks.values());
  if (query?.merchantId) list = list.filter(cb => cb.merchantId === query.merchantId);
  return {
    sort: () => ({
      skip: () => ({
        limit: () => Promise.resolve(list)
      })
    })
  };
};
Chargeback.countDocuments = async (query) => {
  let list = Array.from(memoryStore.chargebacks.values());
  if (query?.merchantId) list = list.filter(cb => cb.merchantId === query.merchantId);
  if (query?.status) {
    if (query.status.$in) {
      list = list.filter(cb => query.status.$in.includes(cb.status));
    } else {
      list = list.filter(cb => cb.status === query.status);
    }
  }
  return list.length;
};
Chargeback.findOne = async (query) => {
  if (query?.$or) {
    for (const cond of query.$or) {
      if (cond.chargebackId) {
        const found = Array.from(memoryStore.chargebacks.values()).find(cb => cb.chargebackId === cond.chargebackId);
        if (found) return found;
      }
      if (cond._id) {
        const found = memoryStore.chargebacks.get(String(cond._id));
        if (found) return found;
      }
    }
  }
  if (query?.chargebackId) {
    return Array.from(memoryStore.chargebacks.values()).find(cb => cb.chargebackId === query.chargebackId) || null;
  }
  return null;
};
Chargeback.create = async (data) => {
  const _id = 'cb_' + Math.random().toString(36).substring(2, 9);
  const record = {
    _id,
    ...data,
    save: async function() {
      memoryStore.chargebacks.set(_id, this);
      return this;
    }
  };
  memoryStore.chargebacks.set(_id, record);
  return record;
};
Chargeback.aggregate = async () => [
  { _id: 'OPEN', count: 1, disputedAmount: 150 }
];

// Mock Evidence
Evidence.find = (query) => {
  let list = Array.from(memoryStore.evidence.values());
  if (query?.chargebackId) list = list.filter(e => e.chargebackId === query.chargebackId);
  return {
    sort: () => Promise.resolve(list)
  };
};
Evidence.create = async (data) => {
  const _id = 'ev_' + Math.random().toString(36).substring(2, 9);
  const record = { _id, ...data, createdAt: new Date() };
  memoryStore.evidence.set(_id, record);
  return record;
};

// Mock AuditLog
AuditLog.create = async (data) => {
  memoryStore.auditLogs.push(data);
  return data;
};

async function runPhase3TestSuite() {
  console.log('=== STARTING PHASE 3 REST API & MODEL TEST SUITE ===');

  // Setup Admin & Merchant users
  const adminPwd = await bcrypt.hash('AdminPassword123!', 10);
  const merchantPwd = await bcrypt.hash('MerchantPassword123!', 10);

  const adminUser = await User.create({
    name: 'Admin Boss',
    email: 'admin@airisk.com',
    passwordHash: adminPwd,
    role: UserRole.ADMIN
  });

  const merchantUser = await User.create({
    name: 'Merchant Acme',
    email: 'merchant@acme.com',
    passwordHash: merchantPwd,
    role: UserRole.MERCHANT,
    merchantId: 'MERCH-ACME'
  });

  // Login tokens
  const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin@airisk.com', password: 'AdminPassword123!' });
  const adminToken = adminLogin.body.token;

  const merchantLogin = await request(app).post('/api/auth/login').send({ email: 'merchant@acme.com', password: 'MerchantPassword123!' });
  const merchantToken = merchantLogin.body.token;

  // 1. Customer APIs
  console.log('\n[1] Testing POST /api/customers');
  const createCustRes = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      customerId: 'CUST-1001',
      totalOrders: 10,
      successfulOrders: 9,
      cancelledOrders: 1,
      previousChargebacks: 1,
      averageOrderValue: 120.50
    });
  console.log('Customer created status:', createCustRes.status, 'Success:', createCustRes.body.success);
  if (createCustRes.status !== 201) throw new Error('Failed to create customer');

  console.log('[1b] Testing GET /api/customers');
  const getCustList = await request(app)
    .get('/api/customers')
    .set('Authorization', `Bearer ${merchantToken}`);
  console.log('Customers count:', getCustList.body.data?.length);
  if (getCustList.status !== 200 || getCustList.body.data.length !== 1) throw new Error('Failed to list customers');

  // 2. Transaction APIs
  console.log('\n[2] Testing POST /api/transactions');
  const createTxRes = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      transactionId: 'TX-9001',
      customerId: 'CUST-1001',
      amount: 250.00,
      paymentMethod: 'CREDIT_CARD',
      isInternational: true,
      ordersLast24h: 2,
      ipCountryMatch: true,
      billingShippingMatch: true
    });
  console.log('Transaction created status:', createTxRes.status, 'Success:', createTxRes.body.success);
  if (createTxRes.status !== 201) throw new Error('Failed to create transaction');

  console.log('[2b] Testing PUT /api/transactions/:id (Updating status & risk)');
  const updateTxRes = await request(app)
    .put('/api/transactions/TX-9001')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      productShipped: true,
      deliveryConfirmed: true,
      riskScore: 28,
      riskLevel: 'LOW',
      chargebackProbability: 0.28,
      expectedLoss: 70.00
    });
  console.log('Transaction update status:', updateTxRes.status, 'Risk Level:', updateTxRes.body.data?.riskLevel);
  if (updateTxRes.status !== 200 || updateTxRes.body.data?.riskLevel !== 'LOW') throw new Error('Failed to update transaction');

  console.log('[2c] Testing GET /api/transactions');
  const getTxRes = await request(app)
    .get('/api/transactions')
    .set('Authorization', `Bearer ${merchantToken}`);
  console.log('Transactions listed:', getTxRes.body.data?.length);
  if (getTxRes.status !== 200 || getTxRes.body.data.length !== 1) throw new Error('Failed to list transactions');

  // 3. Chargeback & Evidence APIs
  console.log('\n[3] Testing POST /api/chargebacks');
  const createCbRes = await request(app)
    .post('/api/chargebacks')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      chargebackId: 'CB-5001',
      transactionId: 'TX-9001',
      amount: 250.00,
      disputeReason: 'FRAUDULENT_TRANSACTION',
      status: 'OPEN'
    });
  console.log('Chargeback created status:', createCbRes.status, 'Success:', createCbRes.body.success);
  if (createCbRes.status !== 201) throw new Error('Failed to create chargeback');

  console.log('[3b] Testing POST /api/chargebacks/:id/evidence');
  const addEvidenceRes = await request(app)
    .post('/api/chargebacks/CB-5001/evidence')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      type: 'PROOF_OF_DELIVERY',
      description: 'Signed delivery receipt with FedEx Tracking #987654321',
      verificationStatus: 'VERIFIED',
      metadata: { carrier: 'FedEx', trackingNumber: '987654321', signedBy: 'J. Doe' }
    });
  console.log('Evidence created status:', addEvidenceRes.status, 'Success:', addEvidenceRes.body.success);
  if (addEvidenceRes.status !== 201) throw new Error('Failed to attach evidence');

  console.log('[3c] Testing GET /api/chargebacks/:id/evidence');
  const getEvidenceRes = await request(app)
    .get('/api/chargebacks/CB-5001/evidence')
    .set('Authorization', `Bearer ${merchantToken}`);
  console.log('Evidence attached count:', getEvidenceRes.body.data?.length);
  if (getEvidenceRes.status !== 200 || getEvidenceRes.body.data.length !== 1) throw new Error('Failed to fetch evidence');

  console.log('[3d] Testing PUT /api/chargebacks/:id (Reviewer update)');
  const updateCbRes = await request(app)
    .put('/api/chargebacks/CB-5001')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      status: 'PENDING_REVIEW',
      defenseSuccessProbability: 0.85,
      evidenceScore: 90,
      recommendation: 'DEFEND',
      generatedResponse: 'Evidence-grounded dispute response letter draft...',
      reviewStatus: 'APPROVED'
    });
  console.log('Chargeback updated status:', updateCbRes.status, 'Review Status:', updateCbRes.body.data?.reviewStatus);
  if (updateCbRes.status !== 200 || updateCbRes.body.data?.reviewStatus !== 'APPROVED') throw new Error('Failed to update chargeback');

  // 4. Analytics APIs
  console.log('\n[4] Testing GET /api/analytics/merchant');
  const merchantAnalyticsRes = await request(app)
    .get('/api/analytics/merchant')
    .set('Authorization', `Bearer ${merchantToken}`);
  console.log('Merchant analytics status:', merchantAnalyticsRes.status, 'Summary:', merchantAnalyticsRes.body.data?.summary);
  if (merchantAnalyticsRes.status !== 200) throw new Error('Failed merchant analytics');

  console.log('[4b] Testing GET /api/analytics/admin');
  const adminAnalyticsRes = await request(app)
    .get('/api/analytics/admin')
    .set('Authorization', `Bearer ${adminToken}`);
  console.log('Admin analytics status:', adminAnalyticsRes.status, 'System Overview:', adminAnalyticsRes.body.data?.systemOverview);
  if (adminAnalyticsRes.status !== 200) throw new Error('Failed admin analytics');

  // 5. Audit Log verification
  console.log('\n[5] Verifying Audit Logs generated');
  console.log('Total audit logs captured:', memoryStore.auditLogs.length);
  if (memoryStore.auditLogs.length < 4) throw new Error('Audit logs were not properly recorded');

  console.log('\n======================================================');
  console.log('ALL PHASE 3 MODELS AND REST APIS PASSED VERIFICATION!');
  console.log('======================================================');
}

runPhase3TestSuite().catch(err => {
  console.error('Phase 3 Test Failure:', err);
  process.exit(1);
});
