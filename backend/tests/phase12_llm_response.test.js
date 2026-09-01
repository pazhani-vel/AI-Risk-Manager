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

async function testPhase12() {
  console.log('=== RUNNING PHASE 12: LLM RESPONSE GENERATION TEST ===');

  // 1. Setup Reviewer User
  const pwd = await bcrypt.hash('Reviewer123!', 10);
  await User.create({
    name: 'Alex Reviewer',
    email: 'reviewer@airisk.com',
    passwordHash: pwd,
    role: UserRole.REVIEWER
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'reviewer@airisk.com',
    password: 'Reviewer123!'
  });
  const token = loginRes.body.token;

  // 2. Setup Transaction & Chargeback
  await Transaction.create({
    transactionId: 'TX-9900',
    merchantId: 'MERCH-001',
    customerId: 'CUST-9900',
    amount: 450.00,
    paymentMethod: 'CREDIT_CARD',
    timestamp: new Date()
  });

  await Chargeback.create({
    chargebackId: 'CB-9900',
    merchantId: 'MERCH-001',
    transactionId: 'TX-9900',
    amount: 450.00,
    disputeReason: 'PRODUCT_NOT_RECEIVED',
    status: 'UNDER_REVIEW',
    defenseSuccessProbability: 0.82,
    defenseScore: 82.0,
    recommendation: 'STRONG_DEFENSE'
  });

  // 3. Attach 1 VERIFIED evidence and 1 UNVERIFIED evidence
  await Evidence.create({
    chargebackId: 'CB-9900',
    type: 'DELIVERY',
    description: 'Signed carrier bill of lading delivered to cardholder front porch',
    verificationStatus: 'VERIFIED',
    metadata: { carrier: 'UPS', trackingNumber: '1Z9999999999999999' }
  });

  await Evidence.create({
    chargebackId: 'CB-9900',
    type: 'CUSTOMER_HISTORY',
    description: 'Unverified preliminary chat transcript',
    verificationStatus: 'UNVERIFIED'
  });

  // 4. Trigger LLM Response Generation (POST /api/chargebacks/:id/generate-response)
  console.log('\nInvoking POST /api/chargebacks/CB-9900/generate-response...');
  const genRes = await request(app)
    .post('/api/chargebacks/CB-9900/generate-response')
    .set('Authorization', `Bearer ${token}`);

  console.log('Response Status:', genRes.status);
  console.log('Generated Draft Snippet:\n', genRes.body.data?.generatedDraft?.substring(0, 300) + '...\n');

  if (genRes.status !== 200 || !genRes.body.success) {
    throw new Error('LLM response generation failed');
  }

  const data = genRes.body.data;
  if (!data.generatedDraft.includes('CB-9900')) throw new Error('Missing Case ID in draft');
  if (!data.generatedDraft.includes('1Z9999999999999999')) throw new Error('Missing verified tracking citation in draft');
  if (data.generatedDraft.includes('Unverified preliminary chat')) throw new Error('Unverified evidence leaked into grounded draft');
  if (data.evidenceUsed.length !== 1) throw new Error('Evidence used count mismatch (should be 1 verified item)');

  // 5. Verify Persistence & State Machine
  if (memoryStore.disputeResponses.length !== 1) throw new Error('DisputeResponse not saved to MongoDB');
  const storedCb = memoryStore.chargebacks.get(Array.from(memoryStore.chargebacks.keys())[0]);
  if (storedCb.status !== 'RESPONSE_DRAFTED') throw new Error('Chargeback status was not updated to RESPONSE_DRAFTED');

  const audit = memoryStore.auditLogs.find(a => a.action === 'CHARGEBACK_RESPONSE_GENERATED');
  if (!audit) throw new Error('Audit log for LLM generation was not created');

  console.log('Stored DisputeResponse Provider:', memoryStore.disputeResponses[0].provider);
  console.log('Updated Chargeback Status:', storedCb.status);
  console.log('Audit Log Action:', audit.action);

  console.log('\n======================================================');
  console.log('PHASE 12 LLM RESPONSE GENERATION TEST PASSED!');
  console.log('======================================================');
}

testPhase12().catch(err => {
  console.error('Phase 12 Test Failure:', err);
  process.exit(1);
});
