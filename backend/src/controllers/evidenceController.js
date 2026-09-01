import { Evidence, EVIDENCE_TYPES, VERIFICATION_STATUSES } from '../models/Evidence.js';
import { Chargeback } from '../models/Chargeback.js';
import { logAudit } from '../utils/auditLogger.js';

/**
 * Helper to compute evidence stats and completeness score
 * Strict Rule: Only VERIFIED evidence counts towards verified categories and score.
 */
export const calculateEvidenceStats = (evidenceList) => {
  const totalCount = evidenceList.length;
  const verifiedItems = evidenceList.filter(e => e.verificationStatus === 'VERIFIED');
  const unverifiedItems = evidenceList.filter(e => e.verificationStatus === 'UNVERIFIED');
  const rejectedItems = evidenceList.filter(e => e.verificationStatus === 'REJECTED');

  const verifiedCategories = Array.from(new Set(verifiedItems.map(e => e.type)));
  const missingCategories = EVIDENCE_TYPES.filter(cat => !verifiedCategories.includes(cat));

  // Completeness score 0-100 based on distinct verified categories out of total 9 standard categories
  const completenessScore = Math.round((verifiedCategories.length / EVIDENCE_TYPES.length) * 100);

  return {
    totalCount,
    verifiedCount: verifiedItems.length,
    unverifiedCount: unverifiedItems.length,
    rejectedCount: rejectedItems.length,
    completenessScore,
    verifiedCategories,
    missingCategories,
    allStandardCategories: EVIDENCE_TYPES
  };
};

/**
 * GET /api/chargebacks/:id/evidence
 * Fetch all evidence for a chargeback along with completeness & missing categories telemetry
 */
export const getChargebackEvidence = async (req, res) => {
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
        message: 'Unauthorized access to this dispute evidence'
      });
    }

    const evidenceList = await Evidence.find({ chargebackId: chargeback.chargebackId }).sort({ createdAt: -1 });
    const stats = calculateEvidenceStats(evidenceList);

    return res.status(200).json({
      success: true,
      data: evidenceList,
      stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve evidence items'
    });
  }
};

/**
 * POST /api/chargebacks/:id/evidence
 * Attach evidence item to chargeback
 */
export const createChargebackEvidence = async (req, res) => {
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

    if (req.user.role === 'MERCHANT' && req.user.merchantId && chargeback.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to attach evidence'
      });
    }

    if (!type || !EVIDENCE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Valid evidence type required. Options: ${EVIDENCE_TYPES.join(', ')}`
      });
    }

    // Role enforcement on verification: Only Analysts, Reviewers, Admins can mark directly VERIFIED
    let initialVerification = 'UNVERIFIED';
    if (verificationStatus && VERIFICATION_STATUSES.includes(verificationStatus)) {
      if (verificationStatus === 'VERIFIED') {
        if (['ADMIN', 'RISK_ANALYST', 'REVIEWER'].includes(req.user.role)) {
          initialVerification = 'VERIFIED';
        } else {
          initialVerification = 'UNVERIFIED'; // Merchant uploads remain UNVERIFIED until reviewed
        }
      } else {
        initialVerification = verificationStatus;
      }
    }

    const evidence = await Evidence.create({
      chargebackId: chargeback.chargebackId,
      type,
      description: description || '',
      source: source || (req.user.role === 'MERCHANT' ? 'MERCHANT_UPLOAD' : 'SYSTEM'),
      verificationStatus: initialVerification,
      metadata: metadata || {}
    });

    // Update chargeback's evidence completeness score
    const allEvidence = await Evidence.find({ chargebackId: chargeback.chargebackId });
    const stats = calculateEvidenceStats(allEvidence);
    chargeback.evidenceScore = stats.completenessScore;
    await chargeback.save();

    await logAudit({
      user: req.user,
      action: 'EVIDENCE_UPLOADED',
      entityType: 'EVIDENCE',
      entityId: String(evidence._id),
      details: {
        chargebackId: chargeback.chargebackId,
        type: evidence.type,
        verificationStatus: evidence.verificationStatus
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Evidence attached successfully',
      data: evidence,
      stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create evidence item'
    });
  }
};

/**
 * PUT /api/evidence/:id
 * Update evidence item (verify, reject, edit description/metadata)
 */
export const updateEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationStatus, description, metadata, type } = req.body;

    const evidence = await Evidence.findById(id);
    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence record not found'
      });
    }

    const previousStatus = evidence.verificationStatus;

    if (type && EVIDENCE_TYPES.includes(type)) {
      evidence.type = type;
    }
    if (description !== undefined) {
      evidence.description = description;
    }
    if (metadata !== undefined) {
      evidence.metadata = metadata;
    }

    if (verificationStatus) {
      if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid verificationStatus. Allowed: ${VERIFICATION_STATUSES.join(', ')}`
        });
      }

      // Role check: Only Analyst, Reviewer, Admin can verify/reject evidence
      if (['VERIFIED', 'REJECTED'].includes(verificationStatus)) {
        if (!['ADMIN', 'RISK_ANALYST', 'REVIEWER'].includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            message: 'Only Risk Analysts, Reviewers, or Admins may verify or reject evidence'
          });
        }
      }

      evidence.verificationStatus = verificationStatus;
    }

    await evidence.save();

    // Recalculate completeness score on linked chargeback
    const chargeback = await Chargeback.findOne({ chargebackId: evidence.chargebackId });
    let stats = null;
    if (chargeback) {
      const allEvidence = await Evidence.find({ chargebackId: chargeback.chargebackId });
      stats = calculateEvidenceStats(allEvidence);
      chargeback.evidenceScore = stats.completenessScore;
      await chargeback.save();
    }

    await logAudit({
      user: req.user,
      action: verificationStatus && verificationStatus !== previousStatus
        ? `EVIDENCE_${verificationStatus}`
        : 'EVIDENCE_UPDATED',
      entityType: 'EVIDENCE',
      entityId: String(evidence._id),
      details: {
        chargebackId: evidence.chargebackId,
        fromStatus: previousStatus,
        toStatus: evidence.verificationStatus,
        type: evidence.type
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Evidence updated successfully',
      data: evidence,
      stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update evidence item'
    });
  }
};

/**
 * DELETE /api/evidence/:id
 * Remove an evidence item
 */
export const deleteEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const evidence = await Evidence.findById(id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: 'Evidence record not found'
      });
    }

    const chargebackId = evidence.chargebackId;
    await Evidence.findByIdAndDelete(id);

    // Recalculate score
    const chargeback = await Chargeback.findOne({ chargebackId });
    let stats = null;
    if (chargeback) {
      const allEvidence = await Evidence.find({ chargebackId });
      stats = calculateEvidenceStats(allEvidence);
      chargeback.evidenceScore = stats.completenessScore;
      await chargeback.save();
    }

    await logAudit({
      user: req.user,
      action: 'EVIDENCE_DELETED',
      entityType: 'EVIDENCE',
      entityId: String(id),
      details: { chargebackId, type: evidence.type }
    });

    return res.status(200).json({
      success: true,
      message: 'Evidence item deleted successfully',
      stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete evidence item'
    });
  }
};
