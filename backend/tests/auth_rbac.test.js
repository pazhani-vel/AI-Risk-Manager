import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { User, UserRole } from '../src/models/User.js';

// Mock User storage
const mockUsers = new Map();

User.findOne = (query) => {
  const queryEmail = query?.email;
  const user = Array.from(mockUsers.values()).find(u => u.email === queryEmail);
  return {
    select: (sel) => {
      if (!user) return Promise.resolve(null);
      return Promise.resolve({
        ...user,
        comparePassword: async function(candidatePassword) {
          return bcrypt.compare(candidatePassword, this.passwordHash);
        }
      });
    },
    then: (resolve) => {
      if (!user) return resolve(null);
      return resolve({
        ...user,
        comparePassword: async function(candidatePassword) {
          return bcrypt.compare(candidatePassword, this.passwordHash);
        }
      });
    }
  };
};

User.findById = (id) => {
  const user = mockUsers.get(String(id));
  return {
    select: (sel) => Promise.resolve(user ? { ...user } : null),
    then: (resolve) => Promise.resolve(user ? { ...user } : null)
  };
};

User.create = async (data) => {
  const _id = 'mock_user_id_' + Math.random().toString(36).substring(2, 9);
  const record = {
    _id,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role,
    merchantId: data.merchantId,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mockUsers.set(_id, record);
  return record;
};

async function runTests() {
  console.log('--- STARTING AUTH & RBAC VERIFICATION SUITE ---');

  // Test 1: Health endpoint
  console.log('\n[TEST 1] GET /api/health');
  const healthRes = await request(app).get('/api/health');
  console.log('Status:', healthRes.status, 'Body:', healthRes.body);
  if (healthRes.status !== 200 || healthRes.body.status !== 'ok') {
    throw new Error('Health check failed');
  }

  // Test 2: Register ADMIN, MERCHANT, RISK_ANALYST, REVIEWER
  const roles = [
    { role: UserRole.ADMIN, email: 'admin@airisk.io', name: 'System Admin' },
    { role: UserRole.MERCHANT, email: 'merchant@store.com', name: 'Store Owner', merchantId: 'MERCH-001' },
    { role: UserRole.RISK_ANALYST, email: 'analyst@airisk.io', name: 'Senior Analyst' },
    { role: UserRole.REVIEWER, email: 'reviewer@airisk.io', name: 'Dispute Reviewer' }
  ];

  const authTokens = {};

  for (const item of roles) {
    console.log(`\n[TEST] Registering ${item.role}: ${item.email}`);
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: item.name,
        email: item.email,
        password: 'SecurePassword123!',
        role: item.role,
        merchantId: item.merchantId
      });

    console.log(`Registered ${item.role} status:`, regRes.status, 'Success:', regRes.body.success);
    if (regRes.status !== 201 || !regRes.body.token) {
      throw new Error(`Failed to register ${item.role}`);
    }
  }

  // Test 3: Successful Login
  console.log('\n[TEST 3] Successful Login for ADMIN');
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@airisk.io', password: 'SecurePassword123!' });
  
  console.log('Login status:', loginRes.status, 'Token exists:', !!loginRes.body.token, 'Role:', loginRes.body.user?.role);
  if (loginRes.status !== 200 || loginRes.body.user.role !== 'ADMIN') {
    throw new Error('Login failed');
  }
  authTokens['ADMIN'] = loginRes.body.token;

  // Log in remaining roles
  for (const item of roles) {
    if (item.role === 'ADMIN') continue;
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: item.email, password: 'SecurePassword123!' });
    authTokens[item.role] = res.body.token;
  }

  // Test 4: Invalid Login
  console.log('\n[TEST 4] Invalid Password Login');
  const badLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@airisk.io', password: 'WrongPassword!' });
  console.log('Invalid login status:', badLoginRes.status, 'Message:', badLoginRes.body.message);
  if (badLoginRes.status !== 401) {
    throw new Error('Invalid login was not rejected with 401');
  }

  // Test 5: GET /api/auth/me (Protected Route)
  console.log('\n[TEST 5] GET /api/auth/me with valid Bearer token');
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${authTokens['MERCHANT']}`);
  console.log('Auth Me status:', meRes.status, 'User:', meRes.body.user?.name, 'Role:', meRes.body.user?.role);
  if (meRes.status !== 200 || meRes.body.user.role !== 'MERCHANT') {
    throw new Error('GET /api/auth/me failed');
  }

  // Test 6: GET /api/auth/me without token
  console.log('\n[TEST 6] GET /api/auth/me without token (Unauthorized)');
  const noTokenRes = await request(app).get('/api/auth/me');
  console.log('No token status:', noTokenRes.status);
  if (noTokenRes.status !== 401) {
    throw new Error('Route without token was not blocked with 401');
  }

  // Test 7: Role-Based Access Control
  console.log('\n[TEST 7A] Admin accessing /api/admin/dashboard-stats');
  const adminAccessRes = await request(app)
    .get('/api/admin/dashboard-stats')
    .set('Authorization', `Bearer ${authTokens['ADMIN']}`);
  console.log('Admin access status:', adminAccessRes.status, 'Success:', adminAccessRes.body.success);
  if (adminAccessRes.status !== 200) {
    throw new Error('Admin could not access admin route');
  }

  console.log('\n[TEST 7B] Merchant accessing /api/admin/dashboard-stats (Unauthorized Role)');
  const merchantOnAdminRes = await request(app)
    .get('/api/admin/dashboard-stats')
    .set('Authorization', `Bearer ${authTokens['MERCHANT']}`);
  console.log('Merchant on Admin route status:', merchantOnAdminRes.status, 'Message:', merchantOnAdminRes.body.message);
  if (merchantOnAdminRes.status !== 403) {
    throw new Error('Merchant accessing Admin route was not forbidden with 403');
  }

  console.log('\n[TEST 7C] Analyst accessing /api/analyst/risk-metrics');
  const analystRes = await request(app)
    .get('/api/analyst/risk-metrics')
    .set('Authorization', `Bearer ${authTokens['RISK_ANALYST']}`);
  console.log('Analyst access status:', analystRes.status, 'Success:', analystRes.body.success);
  if (analystRes.status !== 200) {
    throw new Error('Analyst route failed');
  }

  console.log('\n[TEST 7D] Reviewer accessing /api/reviewer/disputes-queue');
  const reviewerRes = await request(app)
    .get('/api/reviewer/disputes-queue')
    .set('Authorization', `Bearer ${authTokens['REVIEWER']}`);
  console.log('Reviewer access status:', reviewerRes.status, 'Success:', reviewerRes.body.success);
  if (reviewerRes.status !== 200) {
    throw new Error('Reviewer route failed');
  }

  console.log('\n========================================');
  console.log('ALL PHASE 2 AUTH & RBAC TESTS PASSED!');
  console.log('========================================');
}

runTests().catch(err => {
  console.error('Test Suite Failure:', err);
  process.exit(1);
});
