import mongoose from 'mongoose';

const merchantSchema = new mongoose.Schema(
  {
    merchantId: {
      type: String,
      required: [true, 'Merchant ID is required'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Merchant name is required'],
      trim: true
    },
    businessCategory: {
      type: String,
      default: 'General Ecommerce',
      trim: true
    },
    riskTier: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const Merchant = mongoose.model('Merchant', merchantSchema);
