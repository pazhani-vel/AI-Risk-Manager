import express from 'express';
import { getCustomers, getCustomerById, createCustomer } from '../controllers/customerController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { UserRole } from '../models/User.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST), getCustomers);
router.get('/:id', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST), getCustomerById);
router.post('/', roleMiddleware(UserRole.ADMIN, UserRole.MERCHANT, UserRole.RISK_ANALYST), createCustomer);

export default router;
