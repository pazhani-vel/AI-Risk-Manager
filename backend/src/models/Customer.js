import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      unique: true,
      trim: true
    },
    merchantId: {
      type: String,
      required: [true, 'Merchant ID is required'],
      trim: true,
      index: true
    },
    accountAgeDays: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    successfulOrders: {
      type: Number,
      default: 0
    },
    cancelledOrders: {
      type: Number,
      default: 0
    },
    previousReturns: {
      type: Number,
      default: 0
    },
    previousRefunds: {
      type: Number,
      default: 0
    },
    previousChargebacks: {
      type: Number,
      default: 0
    },
    customerChargebackRate: {
      type: Number,
      default: 0.0
    },
    customerReturnRate: {
      type: Number,
      default: 0.0
    },
    averageOrderValue: {
      type: Number,
      default: 0.0
    }
  },
  {
    timestamps: true
  }
);

// Auto calculate rates on save if orders exist
customerSchema.pre('save', function (next) {
  if (this.totalOrders > 0) {
    this.customerChargebackRate = Number((this.previousChargebacks / this.totalOrders).toFixed(4));
    this.customerReturnRate = Number((this.previousReturns / this.totalOrders).toFixed(4));
  }
  next();
});

export const Customer = mongoose.model('Customer', customerSchema);
