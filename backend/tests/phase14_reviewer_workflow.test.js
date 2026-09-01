import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { User, UserRole } from '../src/models/User.js';
import { Transaction } from '../src/models/Transaction.js';
import { Chargeback, CHARGEBACK_STATUS } from '../src/models/Chargeback.js';
import { Evidence } from '../src/models/Evidence.js';
import { DisputeResponse } from '../src/models/DisputeResponse.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Customer } from '../src/models/Customer.js';

// In-memory store
const store = {
  users: new Map(),
  transactions: new Map(),
  chargebacks: new Map(),
  evidence: new Map(),
  disputeResponses: [],
  auditLogs: [],
  customers: new Map()
};

// Mock helpers
User.findOne = (q) => {
  const u = Array.from(store.users.values()).find(x => x.email === q?.email);
  return { select: () => Promise.resolve(u ? { ...u, comparePassword: async (pwd) => bcrypt.compare(pwd, u.passwordHash) } : null) };
};
User.findById = (id) => ({ select: () => Promise.resolve(store.users.get(String(id)) || null) });
User.create = async (data) => { const _id = 'u_' + Math.random().toString(36).slice(2,8); const r = { _id, ...data, isActive: true }; store.users.set(_id, r); return r; };

Customer.findOne = async () => null;
Customer.create = async (data) => { const _id = 'c_' + Math.random().toString(36).slice(2,8); const r = { _id, ...data }; store.customers.set(_id, r); return r; };

Transaction.findOne = async (q) => q?.transactionId ? (Array.from(store.transactions.values()).find(t => t.transactionId === q.transactionId) || null) : null;
Transaction.find = () => ({ sort: () => ({ skip: () => ({ limit: () => Promise.resolve([]) }) }) });
Transaction.countDocuments = async () => 0;
Transaction.create = async (data) => { const _id = 'tx_' + Math.random().toString(36).slice(2,8); const r = { _id, ...data, save: async function() { store.transactions.set(_id, this); return this; } }; store.transactions.set(_id, r); return r; };

Chargeback.findOne = async (q) => {
  if (q?.$or) for (const c of q.$or) { const f = c.chargebackId ? Array.from(store.chargebacks.values()).find(x => x.chargebackId === c.chargebackId) : (c._id ? store.chargebacks.get(String(c._id)) : null); if (f) return f; }
  if (q?.chargebackId) return Array.from(store.chargebacks.values()).find(x => x.chargebackId === q.chargebackId) || null;
  return null;
};
Chargeback.create = async (data) => {
  const _id = 'cb_' + Math.random().toString(36).slice(2,8);
  const r = { _id, ...data, createdAt: new Date(), save: async function() { store.chargebacks.set(_id, this); return this; } };
  store.chargebacks.set(_id, r);
  return r;
};

Evidence.find = (q) => { const list = Array.from(store.evidence.values()).filter(e => e.chargebackId === q?.chargebackId); return { sort: () => Promise.resolve(list) }; };
Evidence.create = async (data) => { const _id = 'ev_' + Math.random().toString(36).slice(2,8); const r = { _id, ...data, createdAt: new Date(), save: async function() { store.evidence.set(_id, this); return this; } }; store.evidence.set(_id, r); return r; };

DisputeResponse.create = async (data) => { const r = { _id: 'dr_' + Math.random().toString(36).slice(2,8), ...data }; store.disputeResponses.push(r); return r; };
AuditLog.create = async (data) => { store.auditLogs.push(data); return data; };

async function testPhase14() {
  console.log('=== RUNNING PHASE 14: REVIEWER WORKFLOW TEST ===');

  // Setup users
  const anaHash = await bcrypt.hash('Ana123!', 10);
  const revHash = await bcrypt.hash('Rev123!', 10);
  await User.create({ name: 'Ana Analyst', email: 'ana@airisk.com', passwordHash: anaHash, role: UserRole.RISK_ANALYST });
  await User.create({ name: 'Remy Reviewer', email: 'remy@airisk.com', passwordHash: revHash, role: UserRole.REVIEWER });

  const anaLogin = await request(app).post('/api/auth/login').send({ email: 'ana@airisk.com', password: 'Ana123!' });
  const revLogin = await request(app).post('/api/auth/login').send({ email: 'remy@airisk.com', password: 'Rev123!' });
  const anaToken = anaLogin.body.token;
  const revToken = revLogin.body.token;

  // Setup transaction & chargeback
  await Transaction.create({
    transactionId: 'TX-REV-01',
    merchantId: 'MERCH-001',
    customerId: 'CUST-REV-01',
    amount: 800.00,
    chargebackProbability: 0.72,
    riskScore: 72,
    riskLevel: 'HIGH',
    expectedLoss: 576.00
  });
  await Chargeback.create({
    chargebackId: 'CB-REV-01',
    merchantId: 'MERCH-001',
    transactionId: 'TX-REV-01',
    amount: 800.00,
    disputeReason: 'FRAUDULENT_TRANSACTION',
    status: 'UNDER_REVIEW',
    defenseSuccessProbability: 0.78,
    defenseScore: 78.0,
    evidenceScore: 45
  });

  // Analyst: attach evidence & generate rebuttal draft
  await Evidence.create({ chargebackId: 'CB-REV-01', type: 'DELIVERY', description: 'Signed POD', verificationStatus: 'VERIFIED', metadata: {} });
  const genRes = await request(app).post('/api/chargebacks/CB-REV-01/generate-response').set('Authorization', `Bearer ${anaToken}`);
  console.log('1. Analyst generated rebuttal:', genRes.body.success);
  if (!genRes.body.success) throw new Error('Analyst rebuttal generation failed');

  // Analyst transitions to PENDING_REVIEW
  const sendRes = await request(app).patch('/api/chargebacks/CB-REV-01/status').set('Authorization', `Bearer ${anaToken}`).send({ status: 'PENDING_REVIEW' });
  console.log('2. Status set to PENDING_REVIEW:', sendRes.body.data?.status);
  if (sendRes.body.data?.status !== 'PENDING_REVIEW') throw new Error('PENDING_REVIEW transition failed');

  // Test: Analyst tries to approve (must fail with 403)
  const illegalApprove = await request(app).post('/api/chargebacks/CB-REV-01/review').set('Authorization', `Bearer ${anaToken}`).send({ action: 'APPROVE' });
  console.log('3. Analyst approve attempt (Expected 403):', illegalApprove.status);
  if (illegalApprove.status !== 403) throw new Error('Analyst was allowed to approve - RBAC BREACH');

  // Test: Reviewer attempts REQUEST_CHANGES without notes (must fail)
  const noNotes = await request(app).post('/api/chargebacks/CB-REV-01/review').set('Authorization', `Bearer ${revToken}`).send({ action: 'REQUEST_CHANGES', reviewerNotes: '' });
  console.log('4. REQUEST_CHANGES without notes (Expected 400):', noNotes.status);
  if (noNotes.status !== 400) throw new Error('REQUEST_CHANGES without notes was accepted');

  // Test: Valid REQUEST_CHANGES with notes
  const changeReq = await request(app).post('/api/chargebacks/CB-REV-01/review').set('Authorization', `Bearer ${revToken}`).send({ action: 'REQUEST_CHANGES', reviewerNotes: 'Please add tracking number to the DELIVERY evidence.' });
  console.log('5. REQUEST_CHANGES accepted. New status:', changeReq.body.data?.status, '/ Review status:', changeReq.body.data?.reviewStatus);
  if (changeReq.body.data?.status !== 'UNDER_REVIEW' || changeReq.body.data?.reviewStatus !== 'CHANGES_REQUESTED') {
    throw new Error('REQUEST_CHANGES did not correctly set statuses');
  }

  // Analyst updates status back to PENDING_REVIEW
  const cb = Array.from(store.chargebacks.values()).find(c => c.chargebackId === 'CB-REV-01');
  cb.status = 'PENDING_REVIEW'; cb.generatedResponse = 'Updated rebuttal with tracking number.'; store.chargebacks.set(cb._id, cb);

  // Test: Reviewer approves
  const approveRes = await request(app).post('/api/chargebacks/CB-REV-01/review').set('Authorization', `Bearer ${revToken}`).send({ action: 'APPROVE', reviewerNotes: 'Evidence satisfactory. Approved for bank submission.' });
  console.log('6. Reviewer APPROVED. Status:', approveRes.body.data?.status, '/ ReviewStatus:', approveRes.body.data?.reviewStatus);
  if (approveRes.body.data?.status !== 'APPROVED' || approveRes.body.data?.reviewStatus !== 'APPROVED') {
    throw new Error('APPROVE did not correctly set statuses');
  }
  if (!approveRes.body.data?.reviewedAt) throw new Error('reviewedAt was not recorded');

  // Audit log checks
  const revAudits = store.auditLogs.filter(a => a.userRole === 'REVIEWER');
  console.log('7. Reviewer audit logs:', revAudits.map(a => a.action).join(', '));
  if (revAudits.length < 2) throw new Error('Reviewer audit logs missing');

  console.log('\n======================================================');
  console.log('PHASE 14: REVIEWER WORKFLOW TEST ALL PASSED!');
  console.log('======================================================');
}

testPhase14().catch(err => {
  console.error('Phase 14 Test Failure:', err);
  process.exit(1);
});
