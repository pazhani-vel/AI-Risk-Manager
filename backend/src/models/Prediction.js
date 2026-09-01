import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['TRANSACTION', 'CHARGEBACK']
    },
    entityId: {
      type: String,
      required: [true, 'Entity ID is required'],
      trim: true,
      index: true
    },
    modelName: {
      type: String,
      required: [true, 'Model name is required'],
      enum: ['MODEL_A_CHARGEBACK_RISK', 'MODEL_B_DEFENSE_SUCCESS']
    },
    modelVersion: {
      type: String,
      default: 'v1.0'
    },
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    prediction: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Prediction = mongoose.model('Prediction', predictionSchema);
