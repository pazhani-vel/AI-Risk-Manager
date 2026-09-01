import express from 'express';
import {
  getChargebacks,
  getChargebackById,
  createChargeback,
  updateChargeback,
  predictDefense,
  updateChargebackStatus,
  generateChargebackResponse,
  reviewChargeback
} from '../controllers/chargebackController.js';
import {
  getChargebackEvidence,
  createChargebackEvidence
} from '../controllers/evidenceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { UserRole } from '../models/User.js';

const router = express.Router();

router.use(authMiddleware);

// Chargeback CRUD
router.get('/', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER), getChargebacks);
router.get('/:id', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER), getChargebackById);
router.post('/', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST), createChargeback);
router.put('/:id', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER), updateChargeback);

// Model B Defense Prediction Gateway
router.post(
  '/:id/predict-defense',
  roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER),
  predictDefense
);

// Phase 12: Evidence-Grounded LLM Response Generation
router.post(
  '/:id/generate-response',
  roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER),
  generateChargebackResponse
);

// Phase 14: Human Reviewer Decision (APPROVE / REQUEST_CHANGES / REJECT)
router.post(
  '/:id/review',
  roleMiddleware(UserRole.ADMIN, UserRole.REVIEWER),
  reviewChargeback
);

// State Machine Status Transition
router.patch(
  '/:id/status',
  roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER),
  updateChargebackStatus
);

// Evidence Sub-resources (Phase 11)
router.get('/:id/evidence', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER), getChargebackEvidence);
router.post('/:id/evidence', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER), createChargebackEvidence);

export default router;
