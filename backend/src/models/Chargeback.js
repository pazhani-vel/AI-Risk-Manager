import mongoose from 'mongoose';

/**
 * Phase 10 Status Workflow (enforced state machine):
 * OPEN → UNDER_REVIEW → RESPONSE_DRAFTED → PENDING_REVIEW → APPROVED → SUBMITTED → RESOLVED
 *                                                          → REJECTED → (back to UNDER_REVIEW)
 */
export const CHARGEBACK_STATUS = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESPONSE_DRAFTED: 'RESPONSE_DRAFTED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUBMITTED: 'SUBMITTED',
  RESOLVED: 'RESOLVED'
};

// Valid state transitions map
export const VALID_STATUS_TRANSITIONS = {
  OPEN:              ['UNDER_REVIEW'],
  UNDER_REVIEW:      ['RESPONSE_DRAFTED'],
  RESPONSE_DRAFTED:  ['PENDING_REVIEW'],
  PENDING_REVIEW:    ['APPROVED', 'REJECTED', 'UNDER_REVIEW'],
  APPROVED:          ['SUBMITTED'],
  REJECTED:          ['UNDER_REVIEW'],
  SUBMITTED:         ['RESOLVED'],
  RESOLVED:          []
};

const chargebackSchema = new mongoose.Schema(
  {
    chargebackId: {
      type: String,
      required: [true, 'Chargeback ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    merchantId: {
      type: String,
      required: [true, 'Merchant ID is required'],
      trim: true,
      index: true
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      trim: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Dispute amount is required'],
      min: [0, 'Amount must be positive']
    },
    disputeReason: {
      type: String,
      required: [true, 'Dispute reason is required'],
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(CHARGEBACK_STATUS),
      default: CHARGEBACK_STATUS.OPEN,
      index: true
    },

    // Model A prediction fields (from linked transaction)
    chargebackProbability: {
      type: Number,
      default: null
    },
    expectedLoss: {
      type: Number,
      default: null
    },

    // Model B prediction fields
    defenseSuccessProbability: {
      type: Number,
      default: null
    },
    defenseScore: {
      type: Number,
      default: null
    },
    evidenceScore: {
      type: Number,
      default: null
    },
    recommendation: {
      type: String,
      enum: ['STRONG_DEFENSE', 'REVIEW_REQUIRED', 'WEAK_DEFENSE', null],
      default: null
    },
    modelVersion: {
      type: String,
      default: null
    },

    // Evidence-grounded response and Reviewer human-in-the-loop fields
    generatedResponse: {
      type: String,
      default: null
    },
    reviewStatus: {
      type: String,
      enum: ['UNREVIEWED', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUBMITTED'],
      default: 'UNREVIEWED'
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewerNotes: {
      type: String,
      default: ''
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Chargeback = mongoose.model('Chargeback', chargebackSchema);
