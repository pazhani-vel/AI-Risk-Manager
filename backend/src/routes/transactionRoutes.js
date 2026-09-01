import express from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  predictTransactionRisk
} from '../controllers/transactionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { UserRole } from '../models/User.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER), getTransactions);
router.get('/:id', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST, UserRole.REVIEWER), getTransactionById);
router.post('/', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST), createTransaction);
router.put('/:id', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST), updateTransaction);

// Model A Prediction Gateway Route
router.post(
  '/:id/predict-risk',
  roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST),
  predictTransactionRisk
);

export default router;
