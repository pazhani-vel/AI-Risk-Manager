import { Customer } from '../models/Customer.js';
import { logAudit } from '../utils/auditLogger.js';

/** Escape special regex characters to prevent ReDoS injection */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, merchantId } = req.query;
    const query = {};

    // Role-based filtering
    if (req.user.role === 'MERCHANT') {
      if (req.user.merchantId) {
        query.merchantId = req.user.merchantId;
      }
    } else if (merchantId) {
      query.merchantId = merchantId;
    }

    if (search) {
      const safeSearch = escapeRegex(String(search).trim());
      query.$or = [
        { customerId: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Customer.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: customers,
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
      message: 'Failed to retrieve customers'
    });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customerId: id }]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Role check
    if (req.user.role === 'MERCHANT' && req.user.merchantId && customer.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to customer record'
      });
    }

    return res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve customer'
    });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const {
      customerId,
      merchantId,
      accountAgeDays,
      totalOrders,
      successfulOrders,
      cancelledOrders,
      previousReturns,
      previousRefunds,
      previousChargebacks,
      averageOrderValue
    } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'customerId is required'
      });
    }

    const assignedMerchantId = req.user.role === 'MERCHANT' && req.user.merchantId ? req.user.merchantId : (merchantId || 'MERCH-DEFAULT');

    const existing = await Customer.findOne({ customerId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Customer with ID ${customerId} already exists`
      });
    }

    const customer = await Customer.create({
      customerId,
      merchantId: assignedMerchantId,
      accountAgeDays: Number(accountAgeDays) || 0,
      totalOrders: Number(totalOrders) || 0,
      successfulOrders: Number(successfulOrders) || 0,
      cancelledOrders: Number(cancelledOrders) || 0,
      previousReturns: Number(previousReturns) || 0,
      previousRefunds: Number(previousRefunds) || 0,
      previousChargebacks: Number(previousChargebacks) || 0,
      averageOrderValue: Number(averageOrderValue) || 0.0
    });

    await logAudit({
      user: req.user,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: customer.customerId,
      details: { merchantId: assignedMerchantId }
    });

    return res.status(201).json({
      success: true,
      message: 'Customer profile created successfully',
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create customer'
    });
  }
};
