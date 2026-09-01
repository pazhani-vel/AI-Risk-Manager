import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { User, UserRole } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Transaction } from '../src/models/Transaction.js';
import { Chargeback, CHARGEBACK_STATUS } from '../src/models/Chargeback.js';
import { Evidence, EVIDENCE_TYPES } from '../src/models/Evidence.js';
import { Prediction } from '../src/models/Prediction.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { mlService } from '../src/services/mlService.js';

// In-memory data store
const memoryStore = {
  users: new Map(),
  customers: new Map(),
  transactions: new Map(),
  chargebacks: new Map(),
  evidence: new Map(),
  predictions: [],
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
  const record = { _id, ...data, isActive: true, createdAt: new Date() };
  memoryStore.users.set(_id, record);
  return record;
};

// Mock Customer
Customer.findOne = async (query) => {
  if (query?.customerId) {
    return Array.from(memoryStore.customers.values()).find(c => c.customerId === query.customerId) || null;
  }
  return null;
};
Customer.create = async (data) => {
  const _id = 'cust_' + Math.random().toString(36).substring(2, 9);
  const record = { _id, ...data, createdAt: new Date() };
  memoryStore.customers.set(_id, record);
  return record;
};

// Mock Transaction
Transaction.findOne = async (query) => {
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

// Mock Chargeback
Chargeback.findOne = async (query) => {
  if (query?.$or) {
    for (const cond of query.$or) {
      if (cond.chargebackId) {
        const found = Array.from(memoryStore.chargebacks.values()).find(c => c.chargebackId === cond.chargebackId);
        if (found) return found;
      }
      if (cond._id) {
        const found = memoryStore.chargebacks.get(String(cond._id));
        if (found) return found;
      }
    }
  }
  if (query?.chargebackId) {
    return Array.from(memoryStore.chargebacks.values()).find(c => c.chargebackId === query.chargebackId) || null;
  }
  return null;
};
Chargeback.create = async (data) => {
  const _id = 'cb_' + Math.random().toString(36).substring(2, 9);
  const record = {
    _id,
    ...data,
    createdAt: new Date(),
    save: async function() {
      memoryStore.chargebacks.set(_id, this);
      return this;
    }
  };
  memoryStore.chargebacks.set(_id, record);
  return record;
};

// Mock Evidence
Evidence.find = (query) => {
  const list = Array.from(memoryStore.evidence.values()).filter(e => e.chargebackId === query?.chargebackId);
  return {
    sort: () => Promise.resolve(list),
    then: (resolve) => resolve(list)
  };
};
Evidence.findById = async (id) => {
  const item = memoryStore.evidence.get(String(id));
  if (!item) return null;
  return {
    ...item,
    save: async function() {
      memoryStore.evidence.set(String(id), this);
      return this;
    }
  };
};
Evidence.findByIdAndDelete = async (id) => {
  memoryStore.evidence.delete(String(id));
  return true;
};
Evidence.create = async (data) => {
  const _id = 'ev_' + Math.random().toString(36).substring(2, 9);
  const record = {
    _id,
    ...data,
    createdAt: new Date(),
    save: async function() {
      memoryStore.evidence.set(_id, this);
      return this;
    }
  };
  memoryStore.evidence.set(_id, record);
  return record;
};

// Mock Prediction
Prediction.create = async (data) => {
  const _id = 'pred_' + Math.random().toString(36).substring(2, 9);
  const record = { _id, ...data, createdAt: new Date() };
  memoryStore.predictions.push(record);
  return record;
};

// Mock AuditLog
AuditLog.create = async (data) => {
  memoryStore.auditLogs.push(data);
  return data;
};

// Mock Model B FastAPI
mlService.predictDefenseSuccess = async (payload) => {
  const prob = 0.74;
  const defense_score = 74.0;
  const recommendation = 'STRONG_DEFENSE';
  return {
    probability: prob,
    defense_score,
    recommendation,
    model_version: 'v1.0.0'
  };
};

async function testPhase10And11() {
  console.log('=== RUNNING PHASE 10 & 11 COMPREHENSIVE INTEGRATION TEST ===');

  // 1. Setup Risk Analyst User
  const pwd = await bcrypt.hash('Analyst123!', 10);
  const analystUser = await User.create({
    name: 'Sarah Analyst',
    email: 'analyst@airisk.com',
    passwordHash: pwd,
    role: UserRole.RISK_ANALYST
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'analyst@airisk.com',
    password: 'Analyst123!'
  });
  const token = loginRes.body.token;

  // 2. Setup Customer & Transaction
  await Customer.create({
    customerId: 'CUST-8800',
    merchantId: 'MERCH-001',
    accountAgeDays: 450,
    totalOrders: 15,
    successfulOrders: 14,
    previousChargebacks: 0,
    averageOrderValue: 200.00
  });

  await Transaction.create({
    transactionId: 'TX-8800',
    merchantId: 'MERCH-001',
    customerId: 'CUST-8800',
    amount: 320.00,
    paymentMethod: 'CREDIT_CARD',
    chargebackProbability: 0.25,
    riskScore: 25.0,
    riskLevel: 'LOW',
    expectedLoss: 80.00,
    otpVerified: true,
    trackingAvailable: true,
    deliveryConfirmed: true,
    billingShippingMatch: true,
    ipCountryMatch: true
  });

  // 3. Create Chargeback
  const createCbRes = await request(app)
    .post('/api/chargebacks')
    .set('Authorization', `Bearer ${token}`)
    .send({
      chargebackId: 'CB-8800',
      merchantId: 'MERCH-001',
      transactionId: 'TX-8800',
      amount: 320.00,
      disputeReason: 'FRAUDULENT_TRANSACTION'
    });

  console.log('1. Chargeback Created:', createCbRes.body.data.chargebackId, 'Status:', createCbRes.body.data.status);
  if (createCbRes.status !== 201 || createCbRes.body.data.status !== 'OPEN') {
    throw new Error('Chargeback creation failed');
  }

  // 4. Test Evidence Management (Phase 11)
  console.log('\n2. Testing Evidence Attachment & Completeness (Phase 11)...');
  
  // Attach DELIVERY evidence
  const ev1Res = await request(app)
    .post('/api/chargebacks/CB-8800/evidence')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'DELIVERY',
      description: 'Carrier signed POD by cardholder',
      verificationStatus: 'VERIFIED',
      metadata: { carrier: 'FedEx', trackingNumber: '789012345678' }
    });

  console.log('Attached DELIVERY Evidence status:', ev1Res.status, 'Verification:', ev1Res.body.data.verificationStatus);
  if (ev1Res.status !== 201) throw new Error('Evidence 1 creation failed');

  // Attach TRACKING evidence as UNVERIFIED
  const ev2Res = await request(app)
    .post('/api/chargebacks/CB-8800/evidence')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'TRACKING',
      description: 'Carrier delivery confirmation scan',
      verificationStatus: 'UNVERIFIED',
      metadata: { carrier: 'FedEx' }
    });

  const ev2Id = ev2Res.body.data._id;
  console.log('Attached TRACKING Evidence (UNVERIFIED):', ev2Id);

  // Fetch Evidence & Stats
  const listEvRes = await request(app)
    .get('/api/chargebacks/CB-8800/evidence')
    .set('Authorization', `Bearer ${token}`);

  console.log('Evidence List Stats:', listEvRes.body.stats);
  if (listEvRes.body.stats.verifiedCount !== 1) throw new Error('Verified count mismatch');
  if (listEvRes.body.stats.unverifiedCount !== 1) throw new Error('Unverified count mismatch');

  // Verify second evidence item (PUT /api/evidence/:id)
  const verifyRes = await request(app)
    .put(`/api/evidence/${ev2Id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ verificationStatus: 'VERIFIED' });

  console.log('Updated evidence status to VERIFIED:', verifyRes.body.data.verificationStatus);
  if (verifyRes.body.data.verificationStatus !== 'VERIFIED') throw new Error('Evidence verification update failed');

  // 5. Test Model B Defense Prediction (Phase 10)
  console.log('\n3. Testing Model B Prediction (POST /api/chargebacks/CB-8800/predict-defense)...');
  const predictRes = await request(app)
    .post('/api/chargebacks/CB-8800/predict-defense')
    .set('Authorization', `Bearer ${token}`);

  console.log('Model B Prediction Result:', predictRes.body.data);
  if (predictRes.status !== 200 || !predictRes.body.success) throw new Error('Defense prediction failed');
  if (predictRes.body.data.probability !== 0.74) throw new Error('Probability mismatch');
  if (predictRes.body.data.recommendation !== 'STRONG_DEFENSE') throw new Error('Recommendation mismatch');

  // 6. Test Status State Transitions
  console.log('\n4. Testing Workflow State Transitions (PATCH /api/chargebacks/CB-8800/status)...');

  // Invalid transition test (UNDER_REVIEW -> SUBMITTED should fail)
  const invalidTransRes = await request(app)
    .patch('/api/chargebacks/CB-8800/status')
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'SUBMITTED' });

  console.log('Invalid transition HTTP status (Expected 400):', invalidTransRes.status, 'Message:', invalidTransRes.body.message);
  if (invalidTransRes.status !== 400) throw new Error('Invalid state transition was not prevented');

  // Valid transition test (UNDER_REVIEW -> RESPONSE_DRAFTED)
  const validTransRes = await request(app)
    .patch('/api/chargebacks/CB-8800/status')
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'RESPONSE_DRAFTED' });

  console.log('Valid transition status:', validTransRes.body.data.status);
  if (validTransRes.body.data.status !== 'RESPONSE_DRAFTED') throw new Error('Valid transition failed');

  console.log('\n======================================================');
  console.log('PHASES 10 & 11 INTEGRATION TESTS ALL PASSED!');
  console.log('======================================================');
}

testPhase10And11().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
