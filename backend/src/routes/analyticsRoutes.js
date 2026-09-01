import express from 'express';
import { getMerchantAnalytics, getAdminAnalytics, getLossSummary, getModelMetrics, getAdminPredictionAnalytics } from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { UserRole } from '../models/User.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/loss-summary', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST), getLossSummary);
router.get('/merchant', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST), getMerchantAnalytics);
router.get('/admin', roleMiddleware(UserRole.ADMIN), getAdminAnalytics);
router.get('/model-metrics', roleMiddleware(UserRole.ADMIN, UserRole.RISK_ANALYST), getModelMetrics);
router.get('/admin/predictions', roleMiddleware(UserRole.ADMIN, UserRole.RISK_ANALYST), getAdminPredictionAnalytics);

export default router;
