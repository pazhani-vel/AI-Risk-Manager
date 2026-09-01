import mongoose from 'mongoose';

const disputeResponseSchema = new mongoose.Schema(
  {
    chargebackId: {
      type: String,
      required: [true, 'Chargeback ID is required'],
      trim: true,
      index: true
    },
    generatedDraft: {
      type: String,
      required: [true, 'Generated draft content is required']
    },
    finalContent: {
      type: String,
      default: ''
    },
    model: {
      type: String,
      default: 'claude-3-5-sonnet-20241022'
    },
    provider: {
      type: String,
      default: 'Anthropic'
    },
    evidenceSnapshot: [
      {
        evidenceId: String,
        type: String,
        description: String,
        metadata: mongoose.Schema.Types.Mixed
      }
    ],
    missingEvidenceCategories: [String],
    defenseProbability: {
      type: Number,
      default: null
    },
    defenseScore: {
      type: Number,
      default: null
    },
    recommendation: {
      type: String,
      default: null
    },
    evidenceCitations: [String],
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUBMITTED'],
      default: 'DRAFT'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewNotes: {
      type: String,
      default: ''
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const DisputeResponse = mongoose.model('DisputeResponse', disputeResponseSchema);
