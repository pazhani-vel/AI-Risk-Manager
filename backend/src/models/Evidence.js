import mongoose from 'mongoose';

export const EVIDENCE_TYPES = [
  'PAYMENT',
  'AUTHENTICATION',
  'DELIVERY',
  'TRACKING',
  'OTP',
  'ADDRESS',
  'CUSTOMER_HISTORY',
  'ORDER',
  'REFUND'
];

export const VERIFICATION_STATUSES = [
  'UNVERIFIED',
  'VERIFIED',
  'REJECTED'
];

const evidenceSchema = new mongoose.Schema(
  {
    chargebackId: {
      type: String,
      required: [true, 'Chargeback ID is required'],
      trim: true,
      index: true
    },
    type: {
      type: String,
      required: [true, 'Evidence type is required'],
      enum: EVIDENCE_TYPES
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      enum: ['MERCHANT_UPLOAD', 'CARRIER_API', 'PAYMENT_GATEWAY', 'EMAIL_LOG', 'SYSTEM', 'CUSTOMER_PORTAL'],
      default: 'MERCHANT_UPLOAD'
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'UNVERIFIED',
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: true }
  }
);

export const Evidence = mongoose.model('Evidence', evidenceSchema);
