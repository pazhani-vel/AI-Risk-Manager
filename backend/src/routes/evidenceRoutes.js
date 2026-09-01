import express from 'express';
import {
  updateEvidence,
  deleteEvidence
} from '../controllers/evidenceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { UserRole } from '../models/User.js';

const router = express.Router();

router.use(authMiddleware);

// PUT /api/evidence/:id — update verification status, metadata, description
router.put(
  '/:id',
  roleMiddleware(UserRole.ADMIN, UserRole.RISK_ANALYST, UserRole.REVIEWER, UserRole.MERCHANT),
  updateEvidence
);

// DELETE /api/evidence/:id — delete evidence record
router.delete(
  '/:id',
  roleMiddleware(UserRole.ADMIN, UserRole.RISK_ANALYST, UserRole.REVIEWER, UserRole.MERCHANT),
  deleteEvidence
);

export default router;
