import { Transaction } from '../models/Transaction.js';
import { Customer } from '../models/Customer.js';
import { Prediction } from '../models/Prediction.js';
import { mlService } from '../services/mlService.js';
import { logAudit } from '../utils/auditLogger.js';

/** Escape special regex characters to prevent ReDoS injection */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      merchantId,
      customerId,
      riskLevel,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (req.user.role === 'MERCHANT') {
      if (req.user.merchantId) {
        query.merchantId = req.user.merchantId;
      }
    } else if (merchantId) {
      query.merchantId = merchantId;
    }

    if (customerId) query.customerId = customerId;
    if (riskLevel) query.riskLevel = riskLevel;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (search) {
      const safeSearch = escapeRegex(String(search).trim());
      query.$or = [
        { transactionId: { $regex: safeSearch, $options: 'i' } },
        { customerId: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort({ timestamp: -1 }).skip(skip).limit(Number(limit)),
      Transaction.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: transactions,
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
      message: 'Failed to retrieve transactions'
    });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { transactionId: id }]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (req.user.role === 'MERCHANT' && req.user.merchantId && transaction.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this transaction'
      });
    }

    // Also fetch customer info for complete profile display
    const customer = await Customer.findOne({ customerId: transaction.customerId });

    return res.status(200).json({
      success: true,
      data: transaction,
      customer: customer || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction'
    });
  }
};

export const createTransaction = async (req, res) => {
  try {
    const {
      transactionId,
      merchantId,
      customerId,
      amount,
      paymentMethod,
      timestamp,
      isInternational,
      ordersLast24h,
      amountVsCustomerAvg,
      deviceAgeDays,
      multipleAccountsSameDevice,
      ipCountryMatch,
      billingShippingMatch,
      loginAfterPurchase,
      productShipped,
      deliveryConfirmed,
      otpVerified,
      trackingAvailable
    } = req.body;

    if (!transactionId || !customerId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'transactionId, customerId, and amount are required'
      });
    }

    const assignedMerchantId = req.user.role === 'MERCHANT' && req.user.merchantId ? req.user.merchantId : (merchantId || 'MERCH-001');

    const existing = await Transaction.findOne({ transactionId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Transaction with ID ${transactionId} already exists`
      });
    }

    const transaction = await Transaction.create({
      transactionId,
      merchantId: assignedMerchantId,
      customerId,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'CREDIT_CARD',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      isInternational: Boolean(isInternational),
      ordersLast24h: Number(ordersLast24h) || 1,
      amountVsCustomerAvg: Number(amountVsCustomerAvg) || 1.0,
      deviceAgeDays: Number(deviceAgeDays) || 30,
      multipleAccountsSameDevice: Boolean(multipleAccountsSameDevice),
      ipCountryMatch: ipCountryMatch !== undefined ? Boolean(ipCountryMatch) : true,
      billingShippingMatch: billingShippingMatch !== undefined ? Boolean(billingShippingMatch) : true,
      loginAfterPurchase: Boolean(loginAfterPurchase),
      productShipped: Boolean(productShipped),
      deliveryConfirmed: Boolean(deliveryConfirmed),
      otpVerified: Boolean(otpVerified),
      trackingAvailable: Boolean(trackingAvailable)
    });

    await logAudit({
      user: req.user,
      action: 'TRANSACTION_INGESTED',
      entityType: 'TRANSACTION',
      entityId: transaction.transactionId,
      details: { amount: transaction.amount, merchantId: assignedMerchantId }
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction ingested successfully',
      data: transaction
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create transaction'
    });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { transactionId: id }]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (req.user.role === 'MERCHANT' && req.user.merchantId && transaction.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to modify this transaction'
      });
    }

    const updatableFields = [
      'productShipped',
      'deliveryConfirmed',
      'otpVerified',
      'trackingAvailable',
      'chargebackProbability',
      'riskScore',
      'riskLevel',
      'expectedLoss'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        transaction[field] = req.body[field];
      }
    });

    await transaction.save();

    await logAudit({
      user: req.user,
      action: 'TRANSACTION_UPDATED',
      entityType: 'TRANSACTION',
      entityId: transaction.transactionId,
      details: req.body
    });

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update transaction'
    });
  }
};

/**
 * Trigger Model A Risk Inference via FastAPI and update database state
 */
export const predictTransactionRisk = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Load transaction
    const transaction = await Transaction.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { transactionId: id }]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // 2. Verify merchant authorization
    if (req.user.role === 'MERCHANT' && req.user.merchantId && transaction.merchantId !== req.user.merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to evaluate this transaction'
      });
    }

    // 3. Load associated customer
    let customer = await Customer.findOne({ customerId: transaction.customerId });
    if (!customer) {
      // Default customer profile fallback if customer record hasn't been seeded
      customer = {
        accountAgeDays: 180,
        totalOrders: 5,
        successfulOrders: 5,
        cancelledOrders: 0,
        previousReturns: 0,
        previousRefunds: 0,
        previousChargebacks: 0,
        customerChargebackRate: 0.0,
        customerReturnRate: 0.0,
        averageOrderValue: transaction.amount || 100.0
      };
    }

    // 4. Construct exact Model A feature payload
    const txDate = new Date(transaction.timestamp);
    const transaction_hour = isNaN(txDate.getHours()) ? 12 : txDate.getHours();

    const modelAPayload = {
      account_age_days: Number(customer.accountAgeDays || 0),
      total_orders: Number(customer.totalOrders || 0),
      successful_orders: Number(customer.successfulOrders || 0),
      cancelled_orders: Number(customer.cancelledOrders || 0),
      previous_returns: Number(customer.previousReturns || 0),
      previous_refunds: Number(customer.previousRefunds || 0),
      previous_chargebacks: Number(customer.previousChargebacks || 0),
      customer_chargeback_rate: Number(customer.customerChargebackRate || 0.0),
      customer_return_rate: Number(customer.customerReturnRate || 0.0),
      average_order_value: Number(customer.averageOrderValue || transaction.amount),

      transaction_amount: Number(transaction.amount),
      payment_method: String(transaction.paymentMethod || 'CREDIT_CARD'),
      transaction_hour: transaction_hour,
      is_international: transaction.isInternational ? 1 : 0,
      orders_last_24h: Number(transaction.ordersLast24h || 1),
      amount_vs_customer_avg: Number(transaction.amountVsCustomerAvg || 1.0),

      device_age_days: Number(transaction.deviceAgeDays || 30),
      multiple_accounts_same_device: transaction.multipleAccountsSameDevice ? 1 : 0,
      ip_country_match: transaction.ipCountryMatch ? 1 : 0,
      billing_shipping_match: transaction.billingShippingMatch ? 1 : 0,
      login_after_purchase: transaction.loginAfterPurchase ? 1 : 0,

      product_shipped: transaction.productShipped ? 1 : 0,
      delivery_confirmed: transaction.deliveryConfirmed ? 1 : 0,
      otp_verified: transaction.otpVerified ? 1 : 0,
      tracking_available: transaction.trackingAvailable ? 1 : 0
    };

    // 5. Invoke FastAPI
    const predictionResult = await mlService.predictChargebackRisk(modelAPayload);

    // 6. Save Prediction Record in MongoDB
    const predictionRecord = await Prediction.create({
      entityType: 'TRANSACTION',
      entityId: transaction.transactionId,
      modelName: 'MODEL_A_CHARGEBACK_RISK',
      modelVersion: predictionResult.model_version || 'v1.0.0',
      probability: predictionResult.probability,
      score: predictionResult.risk_score,
      prediction: {
        risk_level: predictionResult.risk_level,
        expected_loss: predictionResult.expected_loss,
        inputs: modelAPayload
      }
    });

    // 7. Update Transaction in MongoDB
    transaction.chargebackProbability = predictionResult.probability;
    transaction.riskScore = predictionResult.risk_score;
    transaction.riskLevel = predictionResult.risk_level;
    transaction.expectedLoss = predictionResult.expected_loss;
    await transaction.save();

    // 8. Create Audit Log
    await logAudit({
      user: req.user,
      action: 'MODEL_A_RISK_EVALUATED',
      entityType: 'TRANSACTION',
      entityId: transaction.transactionId,
      details: {
        risk_score: predictionResult.risk_score,
        risk_level: predictionResult.risk_level,
        expected_loss: predictionResult.expected_loss
      }
    });

    // 9. Return result to frontend
    return res.status(200).json({
      success: true,
      message: 'Transaction chargeback risk analyzed successfully',
      data: {
        transactionId: transaction.transactionId,
        probability: predictionResult.probability,
        risk_score: predictionResult.risk_score,
        risk_level: predictionResult.risk_level,
        expected_loss: predictionResult.expected_loss,
        model_version: predictionResult.model_version,
        predictionId: predictionRecord._id
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Risk inference pipeline error'
    });
  }
};
