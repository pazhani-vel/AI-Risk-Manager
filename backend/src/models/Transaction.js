import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
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
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      trim: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0, 'Amount must be positive']
    },
    paymentMethod: {
      type: String,
      default: 'CREDIT_CARD',
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    isInternational: {
      type: Boolean,
      default: false
    },
    ordersLast24h: {
      type: Number,
      default: 1
    },
    amountVsCustomerAvg: {
      type: Number,
      default: 1.0
    },
    deviceAgeDays: {
      type: Number,
      default: 30
    },
    multipleAccountsSameDevice: {
      type: Boolean,
      default: false
    },
    ipCountryMatch: {
      type: Boolean,
      default: true
    },
    billingShippingMatch: {
      type: Boolean,
      default: true
    },
    loginAfterPurchase: {
      type: Boolean,
      default: false
    },
    productShipped: {
      type: Boolean,
      default: false
    },
    deliveryConfirmed: {
      type: Boolean,
      default: false
    },
    otpVerified: {
      type: Boolean,
      default: false
    },
    trackingAvailable: {
      type: Boolean,
      default: false
    },

    // Prediction fields (nullable until Model A runs)
    chargebackProbability: {
      type: Number,
      default: null
    },
    riskScore: {
      type: Number,
      default: null
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', null],
      default: null
    },
    expectedLoss: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
