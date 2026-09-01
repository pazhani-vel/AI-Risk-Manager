import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { User, UserRole } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Transaction } from '../src/models/Transaction.js';
import { Prediction } from '../src/models/Prediction.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { mlService } from '../src/services/mlService.js';

// In-memory data store
const memoryStore = {
  users: new Map(),
  customers: new Map(),
  transactions: new Map(),
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

// Mock mlService response matching FastAPI contract
mlService.predictChargebackRisk = async (payload) => {
  const amount = payload.transaction_amount;
  const prob = 0.65;
  const risk_score = 65.0;
  const risk_level = 'HIGH';
  const expected_loss = Number((prob * amount).toFixed(2));
  return {
    probability: prob,
    risk_score,
    risk_level,
    expected_loss,
    model_version: 'v1.0.0'
  };
};

async function testPhase7Flow() {
  console.log('=== RUNNING PHASE 7 END-TO-END INTEGRATION TEST ===');

  // 1. Setup Merchant User
  const pwd = await bcrypt.hash('Secret123!', 10);
  await User.create({
    name: 'Apex Merchant',
    email: 'merchant@apex.com',
    passwordHash: pwd,
    role: UserRole.MERCHANT,
    merchantId: 'MERCH-001'
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'merchant@apex.com',
    password: 'Secret123!'
  });
  const token = loginRes.body.token;

  // 2. Create Customer
  await Customer.create({
    customerId: 'CUST-7701',
    merchantId: 'MERCH-001',
    accountAgeDays: 400,
    totalOrders: 12,
    successfulOrders: 11,
    cancelledOrders: 1,
    previousChargebacks: 1,
    customerChargebackRate: 0.0833,
    averageOrderValue: 150.00
  });

  // 3. Create Transaction
  const createTxRes = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      transactionId: 'TX-7701',
      customerId: 'CUST-7701',
      amount: 200.00,
      paymentMethod: 'CREDIT_CARD',
      isInternational: true,
      ordersLast24h: 3,
      ipCountryMatch: false,
      billingShippingMatch: true
    });

  console.log('Transaction Ingested:', createTxRes.body.success, 'ID:', createTxRes.body.data?.transactionId);
  if (createTxRes.status !== 201) throw new Error('Transaction creation failed');

  // 4. Trigger Model A Risk Inference via Express Gateway -> ML Service
  console.log('\nInvoking POST /api/transactions/TX-7701/predict-risk');
  const predictRes = await request(app)
    .post('/api/transactions/TX-7701/predict-risk')
    .set('Authorization', `Bearer ${token}`);

  console.log('Prediction Response Status:', predictRes.status);
  console.log('Prediction Output Data:', predictRes.body.data);

  if (predictRes.status !== 200 || !predictRes.body.success) {
    throw new Error('Risk prediction endpoint failed');
  }

  const resData = predictRes.body.data;
  if (resData.probability !== 0.65) throw new Error('Probability mismatch');
  if (resData.risk_level !== 'HIGH') throw new Error('Risk level mismatch');
  if (resData.expected_loss !== 130.00) throw new Error('Expected loss calculation mismatch');

  // 5. Verify Database and Audit log updates
  if (memoryStore.predictions.length !== 1) throw new Error('Prediction was not saved to DB');
  const audit = memoryStore.auditLogs.find(a => a.action === 'MODEL_A_RISK_EVALUATED');
  if (!audit) throw new Error('Audit log for risk evaluation was not created');

  console.log('\nVerified MongoDB prediction stored:', memoryStore.predictions[0].modelName);
  console.log('Verified Audit log:', audit.action, 'Target:', audit.entityId);

  console.log('\n======================================================');
  console.log('PHASE 7 INTEGRATION FLOW VERIFIED AND PASSED!');
  console.log('======================================================');
}

testPhase7Flow().catch(err => {
  console.error('Integration failure:', err);
  process.exit(1);
});
