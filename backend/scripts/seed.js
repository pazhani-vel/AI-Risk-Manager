/**
 * ═══════════════════════════════════════════════════════════════
 *  AI Risk Manager — Development Seed Script
 * ═══════════════════════════════════════════════════════════════
 *
 *  ⚠️  DEVELOPMENT ONLY — DO NOT RUN IN PRODUCTION
 *
 *  This script generates realistic synthetic data for local
 *  development and demo purposes. All credentials created here
 *  are development-only and must never be used in production.
 *
 *  ML predictions (Model A / Model B) are intentionally left
 *  null in this seed. Run the real prediction APIs after seeding
 *  to populate risk scores, defense probabilities, etc.
 *
 *  Usage:
 *    cd backend
 *    npm run seed
 *
 *  Environment variables (from .env):
 *    MONGODB_URI — MongoDB connection string
 * ═══════════════════════════════════════════════════════════════
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ─── Safety guard ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('\n❌ ABORT: This seed script is for development only.');
  console.error('   Set NODE_ENV=development (or leave unset) to run.');
  process.exit(1);
}

// ─── Models (import directly to avoid needing the full app) ─
import { User, UserRole } from '../src/models/User.js';
import { Merchant } from '../src/models/Merchant.js';
import { Transaction } from '../src/models/Transaction.js';
import { Chargeback } from '../src/models/Chargeback.js';
import { Evidence, EVIDENCE_TYPES } from '../src/models/Evidence.js';
import { DisputeResponse } from '../src/models/DisputeResponse.js';
import { Customer } from '../src/models/Customer.js';
import { Prediction } from '../src/models/Prediction.js';
import { AuditLog } from '../src/models/AuditLog.js';

// ═══════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════

let idCounters = {};

function uid(prefix) {
  if (!idCounters[prefix]) idCounters[prefix] = 0;
  idCounters[prefix]++;
  return `${prefix}-${String(idCounters[prefix]).padStart(4, '0')}`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Developer-only password (all demo accounts)
const DEMO_PASSWORD = 'DemoPass123!';

// Date range: last 90 days
const NOW = new Date();
const RANGE_START = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════
//  DATA GENERATORS
// ═══════════════════════════════════════════════════════════════

// ─── Merchants ──────────────────────────────────────────────

const MERCHANT_DATA = [
  {
    merchantId: 'MERCH-0001',
    name: 'NorthPeak Electronics',
    businessCategory: 'Consumer Electronics',
    riskTier: 'LOW',
    contactEmail: 'admin@northpeak-dev.example.com'
  },
  {
    merchantId: 'MERCH-0002',
    name: 'Velvet Lane Fashion',
    businessCategory: 'Apparel & Fashion',
    riskTier: 'MEDIUM',
    contactEmail: 'admin@velvetlane-dev.example.com'
  },
  {
    merchantId: 'MERCH-0003',
    name: 'Summit Health Supplies',
    businessCategory: 'Health & Wellness',
    riskTier: 'HIGH',
    contactEmail: 'admin@summitsupplies-dev.example.com'
  }
];

// ─── Users ──────────────────────────────────────────────────

function generateUsers() {
  return [
    // Admin
    {
      name: 'Platform Admin',
      email: 'admin@demo-dev.example.com',
      passwordHash: null, // will be hashed
      role: UserRole.ADMIN,
      merchantId: null
    },

    // Merchants (one per merchant)
    ...MERCHANT_DATA.map(m => ({
      name: `${m.name} Admin`,
      email: m.contactEmail,
      passwordHash: null,
      role: UserRole.MERCHANT,
      merchantId: m.merchantId
    })),

    // 8 Risk Analysts
    ...Array.from({ length: 8 }, (_, i) => ({
      name: `Risk Analyst ${String(i + 1).padStart(2, '0')}`,
      email: `analyst${String(i + 1).padStart(2, '0')}@demo-dev.example.com`,
      passwordHash: null,
      role: UserRole.RISK_ANALYST,
      merchantId: null
    })),

    // 7 Reviewers
    ...Array.from({ length: 7 }, (_, i) => ({
      name: `Reviewer ${String(i + 1).padStart(2, '0')}`,
      email: `reviewer${String(i + 1).padStart(2, '0')}@demo-dev.example.com`,
      passwordHash: null,
      role: UserRole.REVIEWER,
      merchantId: null
    }))
  ];
}

// ─── Customers ──────────────────────────────────────────────

function generateCustomers() {
  const customers = [];
  for (let i = 0; i < 100; i++) {
    const merchant = pick(MERCHANT_DATA);
    const accountAge = randInt(30, 1800);
    const totalOrders = randInt(1, 120);
    const successful = Math.max(0, totalOrders - randInt(0, Math.min(15, totalOrders)));
    const returns = randInt(0, Math.floor(totalOrders * 0.1));
    const refunds = randInt(0, Math.floor(totalOrders * 0.08));
    const chargebacks = randInt(0, Math.floor(totalOrders * 0.05));

    customers.push({
      customerId: uid('CUST'),
      merchantId: merchant.merchantId,
      accountAgeDays: accountAge,
      totalOrders,
      successfulOrders: successful,
      cancelledOrders: totalOrders - successful,
      previousReturns: returns,
      previousRefunds: refunds,
      previousChargebacks: chargebacks,
      averageOrderValue: randFloat(20, 800)
    });
  }
  return customers;
}

// ─── Transactions ───────────────────────────────────────────

const PAYMENT_METHODS = ['CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'BANK_TRANSFER'];
const CARD_TYPES = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'];
const CHANNELS = ['WEB', 'MOBILE', 'IN_APP', 'POS'];
const BILLING_COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP', 'BR', 'MX', 'IN'];

function generateTransactions(customers) {
  const transactions = [];
  // Risk distribution: 60% LOW, 20% MEDIUM, 15% HIGH, 5% CRITICAL
  const riskDistribution = [
    ...Array(60).fill('LOW'),
    ...Array(20).fill('MEDIUM'),
    ...Array(15).fill('HIGH'),
    ...Array(5).fill('CRITICAL')
  ];

  for (let i = 0; i < 1000; i++) {
    const customer = pick(customers);
    const riskBucket = pick(riskDistribution);

    // Amounts correlate loosely with risk
    let amount;
    switch (riskBucket) {
      case 'LOW':      amount = randFloat(10, 300); break;
      case 'MEDIUM':   amount = randFloat(50, 600); break;
      case 'HIGH':     amount = randFloat(100, 1200); break;
      case 'CRITICAL': amount = randFloat(200, 3000); break;
    }

    const isInternational = pick([false, false, false, true]);
    const ipMatch = riskBucket === 'CRITICAL' ? false : pick([true, true, true, false]);
    const billingShippingMatch = pick([true, true, true, false]);
    const ordersLast24h = riskBucket === 'CRITICAL' ? randInt(3, 8) : randInt(0, 3);
    const deviceAgeDays = riskBucket === 'CRITICAL' ? randInt(0, 5) : randInt(1, 365);

    // Use transactionId from existing chargeback lookup pattern
    const txId = uid('TX');

    transactions.push({
      transactionId: txId,
      merchantId: customer.merchantId,
      customerId: customer.customerId,
      amount,
      paymentMethod: pick(PAYMENT_METHODS),
      timestamp: randomDate(RANGE_START, NOW),
      isInternational,
      ordersLast24h,
      amountVsCustomerAvg: randFloat(0.5, 4.0),
      deviceAgeDays,
      multipleAccountsSameDevice: riskBucket === 'CRITICAL' ? pick([true, false]) : false,
      ipCountryMatch: ipMatch,
      billingShippingMatch,
      loginAfterPurchase: pick([true, false]),
      productShipped: pick([true, true, false]),
      deliveryConfirmed: pick([true, false]),
      otpVerified: pick([true, false]),
      trackingAvailable: pick([true, false]),

      // ML predictions left NULL — run real Model A API after seeding
      chargebackProbability: null,
      riskScore: null,
      riskLevel: null,
      expectedLoss: null
    });
  }

  return transactions;
}

// ─── Chargebacks ────────────────────────────────────────────

const DISPUTE_REASONS = [
  'PRODUCT_NOT_RECEIVED',
  'UNAUTHORIZED_TRANSACTION',
  'PRODUCT_NOT_AS_DESCRIBED',
  'DUPLICATE_CHARGE',
  'REFUND_NOT_RECEIVED',
  'SUBSCRIPTION_CANCELLED',
  'FRAUDULENT',
  'QUALITY_NOT_AS_EXPECTED'
];

const CHARGEBACK_STATUS_WORKFLOW = {
  OPEN:               ['UNDER_REVIEW'],
  UNDER_REVIEW:       ['RESPONSE_DRAFTED'],
  RESPONSE_DRAFTED:   ['PENDING_REVIEW'],
  PENDING_REVIEW:     ['APPROVED', 'REJECTED', 'UNDER_REVIEW'],
  APPROVED:           ['SUBMITTED'],
  REJECTED:           ['UNDER_REVIEW'],
  SUBMITTED:          ['RESOLVED'],
  RESOLVED:           []
};

function generateChargebacks(transactions) {
  const chargebacks = [];

  // Pick ~100 transactions that become chargebacks (ensure unique txIds)
  const chargedTxIndices = new Set();
  let attempts = 0;
  while (chargedTxIndices.size < 100 && attempts < 2000) {
    chargedTxIndices.add(randInt(0, transactions.length - 1));
    attempts++;
  }

  const selectedTx = [...chargedTxIndices].map(i => transactions[i]);

  // Status distribution for chargebacks:
  // 30 OPEN, 15 UNDER_REVIEW, 10 RESPONSE_DRAFTED, 15 PENDING_REVIEW,
  // 10 APPROVED, 10 REJECTED, 5 SUBMITTED, 5 RESOLVED
  const statusDistribution = [
    ...Array(30).fill('OPEN'),
    ...Array(15).fill('UNDER_REVIEW'),
    ...Array(10).fill('RESPONSE_DRAFTED'),
    ...Array(15).fill('PENDING_REVIEW'),
    ...Array(10).fill('APPROVED'),
    ...Array(10).fill('REJECTED'),
    ...Array(5).fill('SUBMITTED'),
    ...Array(5).fill('RESOLVED')
  ];

  for (let i = 0; i < selectedTx.length; i++) {
    const tx = selectedTx[i];
    const status = statusDistribution[i] || 'OPEN';
    const amount = tx.amount;

    chargebacks.push({
      chargebackId: uid('CB'),
      merchantId: tx.merchantId,
      transactionId: tx.transactionId,
      amount,
      disputeReason: pick(DISPUTE_REASONS),
      status,

      // Model A fields (populated from transaction; left NULL here — run API after seeding)
      chargebackProbability: null,
      expectedLoss: null,

      // Model B fields (left NULL — run API after seeding)
      defenseSuccessProbability: null,
      defenseScore: null,
      evidenceScore: null,
      recommendation: null,
      modelVersion: null,

      // Response & review (left NULL for OPEN; populated for advanced statuses)
      generatedResponse: null,
      reviewStatus: status === 'PENDING_REVIEW' ? 'PENDING_REVIEW' :
                    status === 'APPROVED' ? 'APPROVED' :
                    status === 'REJECTED' ? 'REJECTED' :
                    status === 'SUBMITTED' ? 'APPROVED' :
                    status === 'RESOLVED' ? 'APPROVED' :
                    'UNREVIEWED',
      reviewerId: null,
      reviewerNotes: '',
      reviewedAt: null
    });
  }

  return chargebacks;
}

// ─── Evidence ───────────────────────────────────────────────

const EVIDENCE_SOURCES = ['MERCHANT_UPLOAD', 'CARRIER_API', 'PAYMENT_GATEWAY', 'EMAIL_LOG', 'SYSTEM'];
const VERIFICATION_STATUSES = ['UNVERIFIED', 'VERIFIED', 'REJECTED'];

const EVIDENCE_DESCRIPTIONS = {
  PAYMENT: [
    'Credit card statement showing transaction details',
    'Payment gateway authorization log with AVS match',
    '3D Secure authentication record'
  ],
  AUTHENTICATION: [
    'OTP verification log from issuing bank',
    'Biometric login record with device fingerprint',
    'Two-factor authentication confirmation email'
  ],
  DELIVERY: [
    'Signed proof of delivery from FedEx carrier',
    'Photo of delivered package at customer address',
    'Delivery confirmation from USPS with signature'
  ],
  TRACKING: [
    'Real-time tracking URL showing delivered status',
    'Carrier API response with delivery timestamps',
    'Shipping label and tracking confirmation'
  ],
  OTP: [
    'One-time password verification record',
    'SMS delivery log showing OTP was received',
    'Email OTP confirmation with timestamp'
  ],
  ADDRESS: [
    'AVS full match verification from payment processor',
    'Billing address verification document',
    'Shipping address matches billing address on file'
  ],
  CUSTOMER_HISTORY: [
    'Customer account history with 12 previous orders all successful',
    'Customer return rate below 1% over 24 months',
    'Customer loyalty program membership since 2021'
  ],
  ORDER: [
    'Original order confirmation email with itemized receipt',
    'Order fulfillment record with warehouse timestamps',
    'Customer-signed delivery receipt for the order'
  ],
  REFUND: [
    'Refund processed and confirmed by payment gateway',
    'Refund transaction ID from issuing bank',
    'Partial refund acknowledgment from customer service'
  ]
};

function generateEvidence(chargebacks) {
  const evidenceList = [];

  for (const cb of chargebacks) {
    if (cb.status === 'OPEN') continue; // OPEN chargebacks may not have evidence yet

    // Number of evidence items varies: 0-5
    // REJECTED cases tend to have fewer; APPROVED/SUBMITTED/RESOLVED tend to have more
    let evidenceCount;
    switch (cb.status) {
      case 'REJECTED':         evidenceCount = randInt(0, 2); break;
      case 'PENDING_REVIEW':   evidenceCount = randInt(1, 4); break;
      case 'APPROVED':         evidenceCount = randInt(3, 5); break;
      case 'SUBMITTED':        evidenceCount = randInt(3, 5); break;
      case 'RESOLVED':         evidenceCount = randInt(2, 5); break;
      default:                 evidenceCount = randInt(0, 3); break;
    }

    const usedTypes = pickN(EVIDENCE_TYPES, evidenceCount);

    for (const type of usedTypes) {
      const descriptions = EVIDENCE_DESCRIPTIONS[type];
      // Determine verification status:
      // ~70% VERIFIED, ~20% UNVERIFIED, ~10% REJECTED
      const verificationStatus = pick(['VERIFIED', 'VERIFIED', 'VERIFIED', 'VERIFIED', 'UNVERIFIED', 'UNVERIFIED', 'REJECTED']);

      evidenceList.push({
        chargebackId: cb.chargebackId,
        type,
        description: pick(descriptions),
        source: pick(EVIDENCE_SOURCES),
        verificationStatus,
        metadata: generateEvidenceMetadata(type)
      });
    }
  }

  return evidenceList;
}

function generateEvidenceMetadata(type) {
  switch (type) {
    case 'TRACKING':
      return {
        carrier: pick(['FedEx', 'UPS', 'USPS', 'DHL']),
        trackingNumber: `TRK${randInt(100000000, 999999999)}`,
        deliveredAt: randomDate(RANGE_START, NOW).toISOString()
      };
    case 'DELIVERY':
      return {
        carrier: pick(['FedEx', 'UPS', 'USPS']),
        signedBy: pick(['J. Smith', 'Cardholder', 'Authorized Person']),
        deliveryDate: randomDate(RANGE_START, NOW).toISOString()
      };
    case 'PAYMENT':
      return {
        processorAuthCode: `AUTH${randInt(100000, 999999)}`,
        avsResult: pick(['Y', 'A', 'Z', 'N']),
        cvvResult: pick(['M', 'N', 'P'])
      };
    case 'OTP':
      return {
        otpCode: String(randInt(100000, 999999)),
        deliveredVia: pick(['SMS', 'EMAIL']),
        verifiedAt: randomDate(RANGE_START, NOW).toISOString()
      };
    case 'ADDRESS':
      return {
        avsResult: pick(['Y', 'A']),
        billingCountry: pick(BILLING_COUNTRIES),
        shippingCountry: pick(BILLING_COUNTRIES)
      };
    case 'ORDER':
      return {
        orderId: uid('ORD'),
        itemCount: randInt(1, 8),
        orderDate: randomDate(RANGE_START, NOW).toISOString()
      };
    case 'AUTHENTICATION':
      return {
        method: pick(['BIOMETRIC', 'SMS_OTP', 'EMAIL_OTP', 'PUSH_NOTIFICATION']),
        verifiedAt: randomDate(RANGE_START, NOW).toISOString()
      };
    case 'CUSTOMER_HISTORY':
      return {
        totalOrders: randInt(10, 120),
        accountAgeDays: randInt(180, 1800),
        previousChargebacks: 0
      };
    case 'REFUND':
      return {
        refundId: uid('REF'),
        refundAmount: randFloat(10, 200),
        refundDate: randomDate(RANGE_START, NOW).toISOString()
      };
    default:
      return {};
  }
}

// ─── Dispute Responses (for chargebacks past DRAFT stage) ──

function generateDisputeResponses(chargebacks, evidenceList, reviewerUsers) {
  const responses = [];

  const eligible = chargebacks.filter(cb =>
    ['RESPONSE_DRAFTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUBMITTED', 'RESOLVED']
      .includes(cb.status)
  );

  for (const cb of eligible) {
    const caseEvidence = evidenceList.filter(e => e.chargebackId === cb.chargebackId);
    const verifiedEvidence = caseEvidence.filter(e => e.verificationStatus === 'VERIFIED');

    const draft = generateDraftText(cb, verifiedEvidence);

    let status = 'DRAFT';
    let reviewedBy = null;
    let reviewNotes = '';

    if (cb.reviewStatus === 'APPROVED' || cb.reviewStatus === 'SUBMITTED') {
      status = 'APPROVED';
      reviewedBy = pick(reviewerUsers)?._id || null;
      reviewNotes = 'Evidence is comprehensive and well-documented. Approved for submission.';
    } else if (cb.reviewStatus === 'REJECTED') {
      status = 'REJECTED';
      reviewedBy = pick(reviewerUsers)?._id || null;
      reviewNotes = 'Insufficient evidence to support the dispute defense. Please gather additional documentation.';
    } else if (cb.status === 'PENDING_REVIEW') {
      status = 'PENDING_REVIEW';
    } else if (cb.status === 'RESPONSE_DRAFTED') {
      status = 'DRAFT';
    }

    responses.push({
      chargebackId: cb.chargebackId,
      generatedDraft: draft,
      finalContent: status === 'APPROVED' ? draft : '',
      model: 'claude-3-5-sonnet-20241022',
      provider: 'Anthropic',
      _verifiedEvidenceList: verifiedEvidence,
      missingEvidenceCategories: generateMissingCategories(caseEvidence),
      defenseProbability: null,  // Run real Model B API after seeding
      defenseScore: null,
      recommendation: null,
      evidenceCitations: verifiedEvidence.map(e => `[${e.type}] ${e.description}`),
      status,
      reviewedBy,
      reviewNotes,
      reviewedAt: ['APPROVED', 'REJECTED'].includes(status) ? randomDate(RANGE_START, NOW) : null,
      submittedAt: status === 'APPROVED' ? randomDate(RANGE_START, NOW) : null,
      generatedAt: randomDate(RANGE_START, NOW)
    });
  }

  return responses;
}

function generateDraftText(chargeback, evidenceList) {
  const evidenceBlock = evidenceList.length > 0
    ? evidenceList.map(e => `- [${e.type}] ${e.description}`).join('\n')
    : 'No verified evidence currently available.';

  return `RE: Chargeback ${chargeback.chargebackId}
Transaction: ${chargeback.transactionId}
Dispute Reason: ${chargeback.disputeReason}
Disputed Amount: $${chargeback.amount.toFixed(2)}

Dear Issuing Bank,

We are writing to formally dispute the above-referenced chargeback. After a thorough review of the transaction and supporting evidence, we believe the chargeback is not warranted.

SUPPORTING EVIDENCE:
${evidenceBlock}

Based on the evidence provided, we respectfully request that this chargeback be reversed. The transaction was authorized by the cardholder, the goods/services were delivered as described, and the merchant has fulfilled all obligations under the card network rules.

We are prepared to provide additional documentation upon request.

Sincerely,
Chargeback Defense Team — ${chargeback.merchantId}`;
}

function generateMissingCategories(evidenceList) {
  const allCategories = EVIDENCE_TYPES;
  const present = new Set(evidenceList.map(e => e.type));
  return allCategories.filter(c => !present.has(c)).slice(0, randInt(2, 5));
}

// ─── Audit Logs ─────────────────────────────────────────────

function generateAuditLogs(users, chargebacks, transactions) {
  const logs = [];

  // User registration logs
  for (const user of users) {
    logs.push({
      userId: null, // will be set after insert
      userEmail: user.email,
      userRole: user.role,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: 'pending',
      details: { name: user.name, role: user.role },
      timestamp: randomDate(RANGE_START, NOW)
    });
  }

  // Transaction creation logs (sample 50)
  const sampledTx = pickN(transactions, 50);
  for (const tx of sampledTx) {
    logs.push({
      userId: null,
      userEmail: 'system',
      userRole: 'SYSTEM',
      action: 'TRANSACTION_INGESTED',
      entityType: 'TRANSACTION',
      entityId: tx.transactionId,
      details: { merchantId: tx.merchantId, amount: tx.amount },
      timestamp: tx.timestamp || randomDate(RANGE_START, NOW)
    });
  }

  // Chargeback lifecycle logs
  for (const cb of chargebacks) {
    logs.push({
      userId: null,
      userEmail: 'system',
      userRole: 'SYSTEM',
      action: 'CHARGEBACK_CREATED',
      entityType: 'CHARGEBACK',
      entityId: cb.chargebackId,
      details: { merchantId: cb.merchantId, amount: cb.amount, reason: cb.disputeReason },
      timestamp: randomDate(RANGE_START, NOW)
    });

    if (cb.status !== 'OPEN') {
      logs.push({
        userId: null,
        userEmail: 'system',
        userRole: 'SYSTEM',
        action: 'CHARGEBACK_STATUS_CHANGED',
        entityType: 'CHARGEBACK',
        entityId: cb.chargebackId,
        details: { newStatus: cb.status },
        timestamp: randomDate(RANGE_START, NOW)
      });
    }

    if (cb.reviewStatus && cb.reviewStatus !== 'UNREVIEWED') {
      logs.push({
        userId: cb.reviewerId,
        userEmail: 'system',
        userRole: 'REVIEWER',
        action: `CHARGEBACK_REVIEW_${cb.reviewStatus}`,
        entityType: 'CHARGEBACK',
        entityId: cb.chargebackId,
        details: { reviewStatus: cb.reviewStatus },
        timestamp: randomDate(RANGE_START, NOW)
      });
    }
  }

  return logs;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════

async function seed() {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   AI Risk Manager — Development Seed Script             ║');
  console.log('║   ⚠️  DEVELOPMENT ONLY — DO NOT RUN IN PRODUCTION       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Connect to MongoDB
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set. Check your .env file.');
    process.exit(1);
  }

  console.log(`📡 Connecting to MongoDB...`);
  await mongoose.connect(uri);
  console.log(`✅ Connected to ${mongoose.connection.db.databaseName}\n`);

  // ── Clear existing data ─────────────────────────────────
  console.log('🧹 Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Merchant.deleteMany({}),
    Transaction.deleteMany({}),
    Chargeback.deleteMany({}),
    Evidence.deleteMany({}),
    DisputeResponse.deleteMany({}),
    Customer.deleteMany({}),
    Prediction.deleteMany({}),
    AuditLog.deleteMany({})
  ]);
  console.log('✅ All collections cleared\n');

  // ── Generate & insert data ──────────────────────────────

  // 1. Users
  console.log('👤 Creating users...');
  const usersData = generateUsers();
  const hashedUsers = await Promise.all(
    usersData.map(async u => ({
      ...u,
      passwordHash: await User.hashPassword(DEMO_PASSWORD)
    }))
  );
  const createdUsers = await User.insertMany(hashedUsers);
  const adminUser = createdUsers.find(u => u.role === UserRole.ADMIN);
  const merchantUsers = createdUsers.filter(u => u.role === UserRole.MERCHANT);
  const analystUsers = createdUsers.filter(u => u.role === UserRole.RISK_ANALYST);
  const reviewerUsers = createdUsers.filter(u => u.role === UserRole.REVIEWER);
  console.log(`   ✅ ${createdUsers.length} users created`);
  console.log(`      Admin: ${adminUser?.email}`);
  console.log(`      Merchants: ${merchantUsers.map(u => u.email).join(', ')}`);
  console.log(`      Analysts: ${analystUsers.length} | Reviewers: ${reviewerUsers.length}\n`);

  // 2. Merchants
  console.log('🏪 Creating merchants...');
  const merchants = await Merchant.insertMany(MERCHANT_DATA);
  console.log(`   ✅ ${merchants.length} merchants created\n`);

  // 3. Customers
  console.log('👥 Creating customers...');
  const customersData = generateCustomers();
  const createdCustomers = await Customer.insertMany(customersData);
  console.log(`   ✅ ${createdCustomers.length} customers created\n`);

  // 4. Transactions
  console.log('💳 Creating transactions...');
  const transactionsData = generateTransactions(createdCustomers);
  const createdTransactions = await Transaction.insertMany(transactionsData);
  console.log(`   ✅ ${createdTransactions.length} transactions created`);
  console.log(`      Risk levels will be populated after running Model A API\n`);

  // 5. Chargebacks
  console.log('⚠️  Creating chargebacks...');
  const chargebacksData = generateChargebacks(createdTransactions);
  const createdChargebacks = await Chargeback.insertMany(chargebacksData);
  console.log(`   ✅ ${createdChargebacks.length} chargebacks created`);
  const statusCounts = {};
  for (const cb of createdChargebacks) {
    statusCounts[cb.status] = (statusCounts[cb.status] || 0) + 1;
  }
  console.log(`      Status distribution: ${Object.entries(statusCounts).map(([k, v]) => `${k}:${v}`).join(' | ')}\n`);

  // 6. Evidence
  console.log('📎 Creating evidence...');
  const evidenceData = generateEvidence(createdChargebacks);
  const createdEvidence = await Evidence.insertMany(evidenceData);
  console.log(`   ✅ ${createdEvidence.length} evidence items created`);
  const evStatusCounts = {};
  for (const ev of createdEvidence) {
    evStatusCounts[ev.verificationStatus] = (evStatusCounts[ev.verificationStatus] || 0) + 1;
  }
  console.log(`      Verification: ${Object.entries(evStatusCounts).map(([k, v]) => `${k}:${v}`).join(' | ')}\n`);

  // 7. Dispute Responses (use create() per-document for complex subdocuments)
  console.log('📝 Creating dispute responses...');
  const disputeResponseData = generateDisputeResponses(
    createdChargebacks, createdEvidence, reviewerUsers
  );
  // Use raw MongoDB collection to bypass Mongoose subdocument casting issues
  const disputeResponseCol = mongoose.connection.collection('disputeresponses');
  const bulkOps = disputeResponseData.map(drData => {
    const snapItems = (drData._verifiedEvidenceList || []).map(e => ({
      evidenceId: String(e._id),
      type: String(e.type),
      description: String(e.description),
      metadata: {}
    }));
    return {
      insertOne: {
        document: {
          chargebackId: drData.chargebackId,
          generatedDraft: drData.generatedDraft,
          finalContent: drData.finalContent || '',
          model: drData.model,
          provider: drData.provider,
          evidenceSnapshot: snapItems,
          missingEvidenceCategories: drData.missingEvidenceCategories || [],
          defenseProbability: drData.defenseProbability,
          defenseScore: drData.defenseScore,
          recommendation: drData.recommendation,
          evidenceCitations: drData.evidenceCitations || [],
          status: drData.status || 'DRAFT',
          reviewedBy: drData.reviewedBy,
          reviewNotes: drData.reviewNotes || '',
          reviewedAt: drData.reviewedAt,
          submittedAt: drData.submittedAt,
          generatedAt: drData.generatedAt || new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    };
  });
  if (bulkOps.length > 0) {
    await disputeResponseCol.bulkWrite(bulkOps, { ordered: true });
  }
  console.log(`   ✅ ${bulkOps.length} dispute responses created\n`);

  // 8. Audit Logs
  console.log('📋 Creating audit logs...');
  const auditData = generateAuditLogs(createdUsers, createdChargebacks, createdTransactions);
  const createdLogs = await AuditLog.insertMany(auditData);
  console.log(`   ✅ ${createdLogs.length} audit log entries created\n`);

  // ── Summary ─────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SEED COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ⏱  Completed in ${elapsed}s`);
  console.log('');
  console.log('  📊 Summary:');
  console.log(`     Users:            ${createdUsers.length}`);
  console.log(`     Merchants:        ${merchants.length}`);
  console.log(`     Customers:        ${createdCustomers.length}`);
  console.log(`     Transactions:     ${createdTransactions.length}`);
  console.log(`     Chargebacks:      ${createdChargebacks.length}`);
  console.log(`     Evidence:         ${createdEvidence.length}`);
  console.log(`     Dispute Responses:${bulkOps.length}`);
  console.log(`     Audit Logs:       ${createdLogs.length}`);
  console.log('');
  console.log('  🔑 Development Login Credentials (all roles):');
  console.log('     Password: DemoPass123!');
  console.log('');
  console.log('     Admin:     admin@demo-dev.example.com');
  console.log('     Merchants: admin@northpeak-dev.example.com');
  console.log('               admin@velvetlane-dev.example.com');
  console.log('               admin@summitsupplies-dev.example.com');
  console.log('     Analysts:  analyst01@demo-dev.example.com');
  console.log('               ... through analyst08@demo-dev.example.com');
  console.log('     Reviewers: reviewer01@demo-dev.example.com');
  console.log('               ... through reviewer07@demo-dev.example.com');
  console.log('');
  console.log('  ⚠️  ML Predictions (Model A / Model B) are NULL.');
  console.log('     Run the real prediction APIs after seeding to populate');
  console.log('     risk scores, chargeback probabilities, defense scores,');
  console.log('     and recommendations.');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');

  await mongoose.connection.close();
  process.exit(0);
}

// ── Run ────────────────────────────────────────────────────
seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err);
  mongoose.connection.close().catch(() => {});
  process.exit(1);
});
