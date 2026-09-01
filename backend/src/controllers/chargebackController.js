import { Chargeback, CHARGEBACK_STATUS, VALID_STATUS_TRANSITIONS } from '../models/Chargeback.js';
import { Evidence } from '../models/Evidence.js';
import { Transaction } from '../models/Transaction.js';
import { Customer } from '../models/Customer.js';
import { Prediction } from '../models/Prediction.js';
import { mlService } from '../services/mlService.js';
import { llmService } from '../services/llmService.js';
import { DisputeResponse } from '../models/DisputeResponse.js';
import { logAudit } from '../utils/auditLogger.js';

/** Escape special regex characters to prevent ReDoS injection */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getChargebacks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      merchantId,
      status,
      reviewStatus
    } = req.query;

    const query = {};

    if (req.user.role === 'MERCHANT') {
      if (req.user.merchantId) {
        query.merchantId = req.user.merchantId;
      }
    } else if (merchantId) {
      query.merchantId = merchantId;
    }

    if (status) query.status = status;
    if (reviewStatus) query.reviewStatus = reviewStatus;

    if (search) {
      const safeSearch = escapeRegex(String(search).trim());
      query.$or = [
        { chargebackId: { $regex: safeSearch, $options: 'i' } },
        { transactionId: { $regex: safeSearch, $options: 'i' } },
        { disputeReason: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [chargebacks, total] = await Promise.all([
      Chargeback.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Chargeback.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: chargebacks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve chargebacks'
    });
  }
};

export const getChargebackById = async (req, res) => {
  try {
    const { id } = req.params;
    const chargeback = await Chargeback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { chargebackId: id }]
    });

    if (!chargeback) {
      return res.status(404).json({
        success: false,
        message: 'Chargeback record not found'
      });
    }

    if (req.user.role === 'MERCHANT' && req.user.merchantId && chargeback.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this chargeback'
      });
    }

    // Also fetch transaction, evidence, and dispute response for enriched review view
    const [transaction, evidenceList, disputeResponse] = await Promise.all([
      Transaction.findOne({ transactionId: chargeback.transactionId }),
      Evidence.find({ chargebackId: chargeback.chargebackId }).sort({ createdAt: -1 }),
      DisputeResponse.findOne({ chargebackId: chargeback.chargebackId }).sort({ createdAt: -1 })
    ]);

    return res.status(200).json({
      success: true,
      data: chargeback,
      transaction: transaction || null,
      evidence: evidenceList || [],
      disputeResponse: disputeResponse || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve chargeback'
    });
  }
};

export const createChargeback = async (req, res) => {
  try {
    const {
      chargebackId,
      merchantId,
      transactionId,
      amount,
      disputeReason,
      status
    } = req.body;

    if (!chargebackId || !transactionId || amount === undefined || !disputeReason) {
      return res.status(400).json({
        success: false,
        message: 'chargebackId, transactionId, amount, and disputeReason are required'
      });
    }

    const assignedMerchantId = req.user.role === 'MERCHANT' && req.user.merchantId ? req.user.merchantId : (merchantId || 'MERCH-001');

    const existing = await Chargeback.findOne({ chargebackId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Chargeback ${chargebackId} already exists`
      });
    }

    // Look up transaction to pull in Model A metrics if already evaluated
    const linkedTx = await Transaction.findOne({ transactionId });

    const chargeback = await Chargeback.create({
      chargebackId,
      merchantId: assignedMerchantId,
      transactionId,
      amount: Number(amount),
      disputeReason,
      status: status || CHARGEBACK_STATUS.OPEN,
      chargebackProbability: linkedTx?.chargebackProbability || null,
      expectedLoss: linkedTx?.expectedLoss || null
    });

    await logAudit({
      user: req.user,
      action: 'CHARGEBACK_CREATED',
      entityType: 'CHARGEBACK',
      entityId: chargeback.chargebackId,
      details: { amount: chargeback.amount, disputeReason }
    });

    return res.status(201).json({
      success: true,
      message: 'Chargeback dispute logged successfully',
      data: chargeback
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create chargeback'
    });
  }
};

export const updateChargeback = async (req, res) => {
  try {
    const { id } = req.params;
    const chargeback = await Chargeback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { chargebackId: id }]
    });

    if (!chargeback) {
      return res.status(404).json({
        success: false,
        message: 'Chargeback not found'
      });
    }

    if (req.user.role === 'MERCHANT' && req.user.merchantId && chargeback.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to modify this chargeback'
      });
    }

    const fields = [
      'status',
      'chargebackProbability',
      'defenseSuccessProbability',
      'defenseScore',
      'evidenceScore',
      'expectedLoss',
      'recommendation',
      'generatedResponse',
      'reviewStatus'
    ];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        chargeback[f] = req.body[f];
      }
    });

    if (req.body.reviewStatus && req.body.reviewStatus !== 'UNREVIEWED') {
      chargeback.reviewerId = req.user._id || req.user.id;
    }

    await chargeback.save();

    await logAudit({
      user: req.user,
      action: 'CHARGEBACK_UPDATED',
      entityType: 'CHARGEBACK',
      entityId: chargeback.chargebackId,
      details: req.body
    });

    return res.status(200).json({
      success: true,
      message: 'Chargeback updated successfully',
      data: chargeback
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update chargeback'
    });
  }
};

export const getEvidenceByChargebackId = async (req, res) => {
  try {
    const { id } = req.params;
    const chargeback = await Chargeback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { chargebackId: id }]
    });

    if (!chargeback) {
      return res.status(404).json({
        success: false,
        message: 'Associated chargeback not found'
      });
    }

    const targetId = chargeback.chargebackId;
    const evidenceList = await Evidence.find({ chargebackId: targetId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: evidenceList
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve evidence records'
    });
  }
};

export const createEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, source, verificationStatus, metadata } = req.body;

    const chargeback = await Chargeback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { chargebackId: id }]
    });

    if (!chargeback) {
      return res.status(404).json({
        success: false,
        message: 'Target chargeback not found'
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Evidence type is required'
      });
    }

    const evidence = await Evidence.create({
      chargebackId: chargeback.chargebackId,
      type,
      description: description || '',
      source: source || 'MERCHANT_UPLOAD',
      verificationStatus: verificationStatus || 'UNVERIFIED',
      metadata: metadata || {}
    });

    await logAudit({
      user: req.user,
      action: 'EVIDENCE_UPLOADED',
      entityType: 'EVIDENCE',
      entityId: evidence._id,
      details: { chargebackId: chargeback.chargebackId, type: evidence.type }
    });

    return res.status(201).json({
      success: true,
      message: 'Evidence uploaded and attached successfully',
      data: evidence
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save evidence'
    });
  }
};

/**
 * POST /api/chargebacks/:id/predict-defense
 * Trigger Model B Defense Success Prediction via FastAPI
 * 
 * Flow:
 * 1. Authenticate user.
 * 2. Verify authorization.
 * 3. Load chargeback.
 * 4. Load linked transaction.
 * 5. Load attached evidence.
 * 6. Build Model B feature vector.
 * 7. Call FastAPI.
 * 8. Save prediction in MongoDB.
 * 9. Update chargeback with scores and recommendation.
 * 10. Create audit log.
 * 11. Return prediction.
 */
export const predictDefense = async (req, res) => {
  try {
    const { id } = req.params;

    // 1 & 2. Authenticate & Verify authorization / Load chargeback
    const chargeback = await Chargeback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { chargebackId: id }]
    });

    if (!chargeback) {
      return res.status(404).json({
        success: false,
        message: 'Chargeback record not found'
      });
    }

    if (req.user.role === 'MERCHANT' && req.user.merchantId && chargeback.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this chargeback'
      });
    }

    // 4. Load linked transaction
    const transaction = await Transaction.findOne({ transactionId: chargeback.transactionId });

    // Customer profile enrichment
    let customer = null;
    if (transaction) {
      customer = await Customer.findOne({ customerId: transaction.customerId });
    }

    // 5. Load attached evidence
    const evidenceList = await Evidence.find({ chargebackId: chargeback.chargebackId });

    // 6. Build Model B feature vector
    const evidenceTypes = evidenceList.map(e => e.type);
    const verifiedCount = evidenceList.filter(e => e.verificationStatus === 'VERIFIED').length;

    const payment_verified = evidenceTypes.includes('INVOICE_RECEIPT') || (transaction && transaction.otpVerified) ? 1 : 0;
    const authentication_verified = (transaction && transaction.otpVerified) ? 1 : 0;
    const delivery_confirmed = evidenceTypes.includes('PROOF_OF_DELIVERY') || (transaction && transaction.deliveryConfirmed) ? 1 : 0;
    const otp_verified = (transaction && transaction.otpVerified) ? 1 : 0;
    const tracking_available = (transaction && transaction.trackingAvailable) ? 1 : 0;
    const shipping_address_match = (transaction && transaction.billingShippingMatch) ? 1 : 0;
    const billing_address_match = (transaction && transaction.billingShippingMatch) ? 1 : 0;
    const device_consistent = (transaction && !transaction.multipleAccountsSameDevice) ? 1 : 0;
    const transaction_authenticated = (transaction && transaction.ipCountryMatch) ? 1 : 0;
    const customer_identity_verified = evidenceTypes.includes('IDENTITY_VERIFICATION') ? 1 : 0;

    const evidence_count = evidenceList.length;
    const evidence_completeness = evidence_count > 0 ? Math.min(evidence_count / 5.0, 1.0) : 0.0;
    const evidence_consistency = evidence_count > 0 ? verifiedCount / evidence_count : 0.0;

    const responseTimeMs = Date.now() - new Date(chargeback.createdAt).getTime();
    const response_time_hours = Math.max(responseTimeMs / (1000 * 60 * 60), 0.1);

    const merchant_response_quality_score = Math.min(
      (evidence_completeness * 0.6) + (evidence_consistency * 0.4),
      1.0
    );

    const modelBPayload = {
      transaction_amount: Number(chargeback.amount),
      customer_account_age_days: Number(customer?.accountAgeDays || 180),
      previous_chargebacks: Number(customer?.previousChargebacks || 0),
      previous_refunds: Number(customer?.previousRefunds || 0),
      customer_order_count: Number(customer?.totalOrders || 5),

      dispute_reason: String(chargeback.disputeReason),

      payment_verified,
      authentication_verified,
      delivery_confirmed,
      otp_verified,
      tracking_available,
      shipping_address_match,
      billing_address_match,
      device_consistent,
      transaction_authenticated,
      customer_identity_verified,

      evidence_count: Number(evidence_count),
      evidence_completeness: Number(evidence_completeness.toFixed(4)),
      evidence_consistency: Number(evidence_consistency.toFixed(4)),

      response_time_hours: Number(response_time_hours.toFixed(2)),
      merchant_response_quality_score: Number(merchant_response_quality_score.toFixed(4))
    };

    // 7. Call FastAPI Model B
    const predictionResult = await mlService.predictDefenseSuccess(modelBPayload);

    // 8. Save prediction in MongoDB
    const predictionRecord = await Prediction.create({
      entityType: 'CHARGEBACK',
      entityId: chargeback.chargebackId,
      modelName: 'MODEL_B_DEFENSE_SUCCESS',
      modelVersion: predictionResult.model_version || 'v1.0.0',
      probability: predictionResult.probability,
      score: predictionResult.defense_score,
      prediction: {
        recommendation: predictionResult.recommendation,
        evidence_completeness,
        evidence_consistency,
        inputs: modelBPayload
      }
    });

    // 9. Update chargeback
    chargeback.defenseSuccessProbability = predictionResult.probability;
    chargeback.defenseScore = predictionResult.defense_score;
    chargeback.recommendation = predictionResult.recommendation;
    chargeback.modelVersion = predictionResult.model_version;
    chargeback.evidenceScore = Number((evidence_completeness * 100).toFixed(1));

    if (transaction && transaction.chargebackProbability !== null) {
      chargeback.chargebackProbability = transaction.chargebackProbability;
      chargeback.expectedLoss = transaction.expectedLoss;
    }

    if (chargeback.status === CHARGEBACK_STATUS.OPEN) {
      chargeback.status = CHARGEBACK_STATUS.UNDER_REVIEW;
    }

    await chargeback.save();

    // 10. Create audit log
    await logAudit({
      user: req.user,
      action: 'MODEL_B_DEFENSE_EVALUATED',
      entityType: 'CHARGEBACK',
      entityId: chargeback.chargebackId,
      details: {
        defense_score: predictionResult.defense_score,
        recommendation: predictionResult.recommendation,
        evidence_count
      }
    });

    // 11. Return prediction
    return res.status(200).json({
      success: true,
      message: 'Defense success prediction evaluated successfully',
      data: {
        chargebackId: chargeback.chargebackId,
        probability: predictionResult.probability,
        defense_score: predictionResult.defense_score,
        recommendation: predictionResult.recommendation,
        model_version: predictionResult.model_version,
        evidence_completeness,
        evidence_consistency,
        evidence_count,
        predictionId: predictionRecord._id
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Defense prediction pipeline error'
    });
  }
};

/**
 * PATCH /api/chargebacks/:id/status
 * Enforce valid status transitions
 */
export const updateChargebackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'New status is required'
      });
    }

    if (!Object.values(CHARGEBACK_STATUS).includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${newStatus}. Allowed values: ${Object.values(CHARGEBACK_STATUS).join(', ')}`
      });
    }

    const chargeback = await Chargeback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { chargebackId: id }]
    });

    if (!chargeback) {
      return res.status(404).json({
        success: false,
        message: 'Chargeback not found'
      });
    }

    if (req.user.role === 'MERCHANT' && req.user.merchantId && chargeback.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to modify this chargeback'
      });
    }

    const currentStatus = chargeback.status;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
      });
    }

    // Strict RBAC: Analysts must NOT approve or submit final responses
    if (newStatus === CHARGEBACK_STATUS.APPROVED || newStatus === CHARGEBACK_STATUS.SUBMITTED) {
      if (!['ADMIN', 'REVIEWER'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only Reviewers or Admins are authorized to approve or submit chargeback responses'
        });
      }
    }

    const previousStatus = chargeback.status;
    chargeback.status = newStatus;

    if (newStatus === CHARGEBACK_STATUS.APPROVED || newStatus === CHARGEBACK_STATUS.REJECTED) {
      chargeback.reviewerId = req.user._id || req.user.id;
      chargeback.reviewStatus = newStatus === CHARGEBACK_STATUS.APPROVED ? 'APPROVED' : 'REJECTED';
    }

    await chargeback.save();

    await logAudit({
      user: req.user,
      action: 'CHARGEBACK_STATUS_CHANGED',
      entityType: 'CHARGEBACK',
      entityId: chargeback.chargebackId,
      details: { from: previousStatus, to: newStatus }
    });

    return res.status(200).json({
      success: true,
      message: `Status transitioned: ${previousStatus} → ${newStatus}`,
      data: chargeback
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update chargeback status'
    });
  }
};

/**
 * POST /api/chargebacks/:id/generate-response
 * Generate an evidence-grounded dispute response letter using verified evidence ONLY
 */
export const generateChargebackResponse = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Load chargeback
    const chargeback = await Chargeback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { chargebackId: id }]
    });

    if (!chargeback) {
      return res.status(404).json({
        success: false,
        message: 'Chargeback record not found'
      });
    }

    if (req.user.role === 'MERCHANT' && req.user.merchantId && chargeback.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this chargeback'
      });
    }

    // 2. Load linked transaction (exclude sensitive secrets)
    const transaction = await Transaction.findOne({ transactionId: chargeback.transactionId });

    // 3. Load verified evidence ONLY
    const allEvidence = await Evidence.find({ chargebackId: chargeback.chargebackId });
    const verifiedEvidence = allEvidence.filter(e => e.verificationStatus === 'VERIFIED');

    // 4. Determine missing standard categories
    const verifiedCategories = Array.from(new Set(verifiedEvidence.map(e => e.type)));
    const allStandardCategories = [
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
    const missingCategories = allStandardCategories.filter(cat => !verifiedCategories.includes(cat));

    // 5. Build structured context & call LLM service
    const llmResult = await llmService.generateRebuttalResponse({
      chargeback,
      transaction,
      verifiedEvidence,
      missingCategories,
      defenseMetrics: {
        probability: chargeback.defenseSuccessProbability,
        defenseScore: chargeback.defenseScore,
        recommendation: chargeback.recommendation
      }
    });

    // 6. Save generated draft and snapshot in DisputeResponse collection
    const evidenceSnapshot = verifiedEvidence.map(e => ({
      evidenceId: String(e._id),
      type: e.type,
      description: e.description,
      metadata: e.metadata
    }));

    const disputeResponse = await DisputeResponse.create({
      chargebackId: chargeback.chargebackId,
      generatedDraft: llmResult.draft,
      finalContent: llmResult.draft,
      model: llmResult.model,
      provider: llmResult.provider,
      evidenceSnapshot,
      missingEvidenceCategories: missingCategories,
      defenseProbability: chargeback.defenseSuccessProbability,
      defenseScore: chargeback.defenseScore,
      recommendation: chargeback.recommendation,
      status: 'DRAFT'
    });

    // 7. Update chargeback document
    chargeback.generatedResponse = llmResult.draft;
    if (chargeback.status === CHARGEBACK_STATUS.OPEN || chargeback.status === CHARGEBACK_STATUS.UNDER_REVIEW) {
      chargeback.status = CHARGEBACK_STATUS.RESPONSE_DRAFTED;
    }
    await chargeback.save();

    // 8. Create audit log
    await logAudit({
      user: req.user,
      action: 'CHARGEBACK_RESPONSE_GENERATED',
      entityType: 'CHARGEBACK',
      entityId: chargeback.chargebackId,
      details: {
        model: llmResult.model,
        provider: llmResult.provider,
        verifiedEvidenceCount: verifiedEvidence.length,
        missingCount: missingCategories.length
      }
    });

    // 9. Return result to frontend
    return res.status(200).json({
      success: true,
      message: 'Evidence-grounded response generated successfully',
      data: {
        chargebackId: chargeback.chargebackId,
        generatedDraft: llmResult.draft,
        model: llmResult.model,
        provider: llmResult.provider,
        generatedAt: llmResult.generatedAt,
        evidenceUsed: evidenceSnapshot,
        missingCategories,
        disputeResponseId: disputeResponse._id
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate chargeback response'
    });
  }
};

/**
 * POST /api/chargebacks/:id/review
 * Reviewer/Manager Human-in-the-Loop Decision
 *
 * Actions:
 *   APPROVE          - Approve the chargeback response for submission
 *   REQUEST_CHANGES  - Return to analyst with reviewer comments
 *   REJECT           - Reject the chargeback response with reason
 *
 * Strict Rules:
 * - Only REVIEWER and ADMIN can call this endpoint.
 * - AI cannot automatically approve anything.
 * - Reviewers cannot modify ML predictions.
 * - All decisions are audit-logged with reviewer ID and timestamp.
 */
export const reviewChargeback = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reviewerNotes } = req.body;

    // 1. Strict RBAC: Only REVIEWER and ADMIN may perform review actions
    if (!['REVIEWER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Reviewers and Admins are authorized to perform human review decisions'
      });
    }

    // 2. Validate action
    const validActions = ['APPROVE', 'REQUEST_CHANGES', 'REJECT'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review action. Must be one of: ${validActions.join(', ')}`
      });
    }

    // 3. Load chargeback
    const chargeback = await Chargeback.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { chargebackId: id }]
    });

    if (!chargeback) {
      return res.status(404).json({
        success: false,
        message: 'Chargeback record not found'
      });
    }

    // 4. Gate: Must be in PENDING_REVIEW status
    if (chargeback.status !== CHARGEBACK_STATUS.PENDING_REVIEW) {
      return res.status(400).json({
        success: false,
        message: `Review actions require PENDING_REVIEW status. Current status: ${chargeback.status}`
      });
    }

    const previousStatus = chargeback.status;
    const reviewerId = req.user._id || req.user.id;
    const reviewedAt = new Date();

    // 5. Apply action: do NOT allow AI to auto-approve; this function is always human-triggered
    if (action === 'APPROVE') {
      chargeback.status = CHARGEBACK_STATUS.APPROVED;
      chargeback.reviewStatus = 'APPROVED';
      chargeback.reviewerId = reviewerId;
      chargeback.reviewedAt = reviewedAt;
      chargeback.reviewerNotes = reviewerNotes || '';
    } else if (action === 'REQUEST_CHANGES') {
      // Return to analyst: PENDING_REVIEW -> UNDER_REVIEW
      if (!reviewerNotes || reviewerNotes.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Reviewer notes are required when requesting changes'
        });
      }
      chargeback.status = CHARGEBACK_STATUS.UNDER_REVIEW;
      chargeback.reviewStatus = 'CHANGES_REQUESTED';
      chargeback.reviewerId = reviewerId;
      chargeback.reviewedAt = reviewedAt;
      chargeback.reviewerNotes = reviewerNotes;
    } else if (action === 'REJECT') {
      if (!reviewerNotes || reviewerNotes.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Reviewer notes / rejection reason are required when rejecting a response'
        });
      }
      chargeback.status = CHARGEBACK_STATUS.REJECTED;
      chargeback.reviewStatus = 'REJECTED';
      chargeback.reviewerId = reviewerId;
      chargeback.reviewedAt = reviewedAt;
      chargeback.reviewerNotes = reviewerNotes;
    }

    await chargeback.save();

    // 6. Audit log
    await logAudit({
      user: req.user,
      action: `CHARGEBACK_REVIEW_${action}`,
      entityType: 'CHARGEBACK',
      entityId: chargeback.chargebackId,
      details: {
        action,
        previousStatus,
        newStatus: chargeback.status,
        reviewerNotes: reviewerNotes || '',
        reviewedAt
      }
    });

    return res.status(200).json({
      success: true,
      message: `Review decision '${action}' recorded successfully`,
      data: {
        chargebackId: chargeback.chargebackId,
        status: chargeback.status,
        reviewStatus: chargeback.reviewStatus,
        reviewerId: chargeback.reviewerId,
        reviewedAt: chargeback.reviewedAt,
        reviewerNotes: chargeback.reviewerNotes
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Review decision processing failed'
    });
  }
};
