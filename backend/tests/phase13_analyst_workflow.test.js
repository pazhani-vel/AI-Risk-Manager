import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { User, UserRole } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Transaction } from '../src/models/Transaction.js';
import { Chargeback, CHARGEBACK_STATUS } from '../src/models/Chargeback.js';
import { Evidence } from '../src/models/Evidence.js';
import { DisputeResponse } from '../src/models/DisputeResponse.js';
import { AuditLog } from '../src/models/AuditLog.js';

// In-memory data store
const memoryStore = {
  users: new Map(),
  customers: new Map(),
  transactions: new Map(),
  chargebacks: new Map(),
  evidence: new Map(),
  disputeResponses: [],
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
Transaction.find = (query) => {
  const list = Array.from(memoryStore.transactions.values());
  return {
    sort: (sortObj) => ({
      skip: () => ({
        limit: () => Promise.resolve(list)
      })
    }),
    then: (resolve) => resolve(list)
  };
};
Transaction.countDocuments = async () => memoryStore.transactions.size;
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

// Mock DisputeResponse
DisputeResponse.create = async (data) => {
  const _id = 'resp_' + Math.random().toString(36).substring(2, 9);
  const record = { _id, ...data, createdAt: new Date() };
  memoryStore.disputeResponses.push(record);
  return record;
};

// Mock AuditLog
AuditLog.create = async (data) => {
  memoryStore.auditLogs.push(data);
  return data;
};

async function testPhase13() {
  console.log('=== RUNNING PHASE 13: RISK ANALYST WORKFLOW TEST ===');

  // 1. Setup Risk Analyst User
  const pwd = await bcrypt.hash('Analyst123!', 10);
  const analystUser = await User.create({
    name: 'Rachel RiskAnalyst',
    email: 'rachel.analyst@airisk.com',
    passwordHash: pwd,
    role: UserRole.RISK_ANALYST
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'rachel.analyst@airisk.com',
    password: 'Analyst123!'
  });
  const token = loginRes.body.token;

  // 2. Setup Seed Transactions with diverse Expected Loss and Chargeback Probabilities
  await Transaction.create({
    transactionId: 'TX-HIGH-01',
    merchantId: 'MERCH-001',
    customerId: 'CUST-100',
    amount: 1200.00,
    chargebackProbability: 0.85,
    riskScore: 85,
    riskLevel: 'CRITICAL',
    expectedLoss: 1020.00
  });

  await Transaction.create({
    transactionId: 'TX-MED-02',
    merchantId: 'MERCH-001',
    customerId: 'CUST-200',
    amount: 400.00,
    chargebackProbability: 0.45,
    riskScore: 45,
    riskLevel: 'MEDIUM',
    expectedLoss: 180.00
  });

  await Transaction.create({
    transactionId: 'TX-LOW-03',
    merchantId: 'MERCH-001',
    customerId: 'CUST-300',
    amount: 100.00,
    chargebackProbability: 0.10,
    riskScore: 10,
    riskLevel: 'LOW',
    expectedLoss: 10.00
  });

  // 3. Test Risk Queue Ingestion
  const queueRes = await request(app)
    .get('/api/transactions')
    .set('Authorization', `Bearer ${token}`);

  console.log('1. Risk Queue Query Status:', queueRes.status, 'Total Items:', queueRes.body.data.length);
  if (queueRes.status !== 200 || queueRes.body.data.length !== 3) throw new Error('Risk queue fetch failed');

  // 4. Setup Dispute Case for Analyst Investigation
  await Chargeback.create({
    chargebackId: 'CB-ANALYST-01',
    merchantId: 'MERCH-001',
    transactionId: 'TX-HIGH-01',
    amount: 1200.00,
    disputeReason: 'FRAUDULENT_TRANSACTION',
    status: 'OPEN'
  });

  // Action A: Analyst marks case UNDER_REVIEW
  console.log('\n2. Testing Action: Mark UNDER_REVIEW...');
  const underReviewRes = await request(app)
    .patch('/api/chargebacks/CB-ANALYST-01/status')
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'UNDER_REVIEW' });

  console.log('Status updated to:', underReviewRes.body.data?.status);
  if (underReviewRes.status !== 200 || underReviewRes.body.data?.status !== 'UNDER_REVIEW') {
    throw new Error('Failed to mark chargeback under review');
  }

  // Action B: Analyst adds evidence
  console.log('\n3. Testing Action: Attach & Verify Evidence...');
  const addEvRes = await request(app)
    .post('/api/chargebacks/CB-ANALYST-01/evidence')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'AUTHENTICATION',
      description: '3D Secure v2 OTP authenticated by issuing bank',
      verificationStatus: 'VERIFIED',
      metadata: { authCode: 'AUTH-3DS-990022', eci: '05' }
    });

  console.log('Evidence attached with status:', addEvRes.status, 'Verification:', addEvRes.body.data?.verificationStatus);
  if (addEvRes.status !== 201 || addEvRes.body.data?.verificationStatus !== 'VERIFIED') {
    throw new Error('Analyst evidence attachment failed');
  }

  // Action C: Analyst generates response draft
  console.log('\n4. Testing Action: Generate Rebuttal Draft...');
  const genDraftRes = await request(app)
    .post('/api/chargebacks/CB-ANALYST-01/generate-response')
    .set('Authorization', `Bearer ${token}`);

  console.log('Draft generated:', genDraftRes.body.success, 'New Status:', memoryStore.chargebacks.get(Array.from(memoryStore.chargebacks.keys())[0]).status);
  if (genDraftRes.status !== 200 || !genDraftRes.body.success) {
    throw new Error('Analyst response generation failed');
  }

  // Action D: Analyst sends response to reviewer (PENDING_REVIEW)
  console.log('\n5. Testing Action: Send for Review (PENDING_REVIEW)...');
  const sendReviewRes = await request(app)
    .patch('/api/chargebacks/CB-ANALYST-01/status')
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'PENDING_REVIEW' });

  console.log('Status updated to:', sendReviewRes.body.data?.status);
  if (sendReviewRes.status !== 200 || sendReviewRes.body.data?.status !== 'PENDING_REVIEW') {
    throw new Error('Failed to send response for review');
  }

  // Action E: Strict RBAC check - Analyst must NOT approve the final response
  console.log('\n6. Testing RBAC Constraint: Analyst must NOT approve response...');
  const illegalApproveRes = await request(app)
    .patch('/api/chargebacks/CB-ANALYST-01/status')
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'APPROVED' });

  console.log('Analyst Approve Attempt HTTP Status (Expected 403):', illegalApproveRes.status, 'Message:', illegalApproveRes.body?.message);
  if (illegalApproveRes.status !== 403) {
    throw new Error('Analyst was illegally allowed to approve a final response');
  }

  // Action F: Verify Audit Logs
  const analystAudits = memoryStore.auditLogs.filter(a => a.userRole === 'RISK_ANALYST');
  console.log('\n7. Total Analyst Audit Logs Created:', analystAudits.length);
  if (analystAudits.length < 3) throw new Error('Audit logs missing for analyst actions');

  console.log('\n======================================================');
  console.log('PHASE 13: RISK ANALYST WORKFLOW TEST ALL PASSED!');
  console.log('======================================================');
}

testPhase13().catch(err => {
  console.error('Phase 13 Test Failure:', err);
  process.exit(1);
});
