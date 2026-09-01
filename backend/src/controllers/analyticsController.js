import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transaction } from '../models/Transaction.js';
import { Chargeback } from '../models/Chargeback.js';
import { DisputeResponse } from '../models/DisputeResponse.js';
import { Prediction } from '../models/Prediction.js';
import { Customer } from '../models/Customer.js';
import { User } from '../models/User.js';
import { mlService } from '../services/mlService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_DIR = path.resolve(__dirname, '../../..', 'models');

export const getMerchantAnalytics = async (req, res) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' && req.user.merchantId ? req.user.merchantId : (req.query.merchantId || null);

    const matchFilter = merchantId ? { merchantId } : {};

    const [
      totalTransactions,
      highRiskTransactions,
      totalChargebacks,
      openDisputes,
      financialAggregates
    ] = await Promise.all([
      Transaction.countDocuments(matchFilter),
      Transaction.countDocuments({ ...matchFilter, riskLevel: { $in: ['HIGH', 'CRITICAL'] } }),
      Chargeback.countDocuments(matchFilter),
      Chargeback.countDocuments({ ...matchFilter, status: { $in: ['OPEN', 'DRAFTING', 'PENDING_REVIEW'] } }),
      Transaction.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$amount' },
            totalExpectedLoss: { $sum: { $ifNull: ['$expectedLoss', 0] } },
            avgRiskScore: { $avg: { $ifNull: ['$riskScore', 0] } }
          }
        }
      ])
    ]);

    const wonDisputes = await Chargeback.countDocuments({ ...matchFilter, status: 'WON' });

    const totalVolume = financialAggregates[0]?.totalVolume || 0;
    const totalExpectedLoss = financialAggregates[0]?.totalExpectedLoss || 0;
    const avgRiskScore = financialAggregates[0]?.avgRiskScore || 0;

    const chargebackRate = totalTransactions > 0 ? (totalChargebacks / totalTransactions) * 100 : 0;
    const winRate = totalChargebacks > 0 ? (wonDisputes / totalChargebacks) * 100 : 0;

    return res.status(200).json({
      success: true,
      merchantId: merchantId || 'ALL',
      data: {
        summary: {
          totalTransactions,
          totalVolume: Number(totalVolume.toFixed(2)),
          totalExpectedLoss: Number(totalExpectedLoss.toFixed(2)),
          avgRiskScore: Number(avgRiskScore.toFixed(1)),
          highRiskCount: highRiskTransactions,
          totalChargebacks,
          openDisputes,
          wonDisputes,
          chargebackRatePercent: Number(chargebackRate.toFixed(2)),
          recoveryWinRatePercent: Number(winRate.toFixed(2))
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute merchant analytics'
    });
  }
};

/**
 * GET /analytics/loss-summary
 * Comprehensive merchant loss analytics with all metrics and chart data.
 * All values computed from real MongoDB data — no hardcoded metrics.
 */
export const getLossSummary = async (req, res) => {
  try {
    const merchantId =
      req.user.role === 'MERCHANT' && req.user.merchantId
        ? req.user.merchantId
        : req.query.merchantId || null;

    const matchFilter = merchantId ? { merchantId } : {};

    // ─── 1. Transaction-level aggregations ───
    const [txAgg] = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalTransactionValue: { $sum: '$amount' },
          highRiskTransactions: {
            $sum: {
              $cond: [{ $in: ['$riskLevel', ['HIGH', 'CRITICAL']] }, 1, 0]
            }
          },
          potentialLoss: {
            // sum of chargebackProbability * amount for ALL transactions (predicted loss exposure)
            $sum: {
              $multiply: [
                { $ifNull: ['$chargebackProbability', 0] },
                { $ifNull: ['$amount', 0] }
              ]
            }
          },
          expectedLoss: {
            // same formula: sum(probability * amount) — this IS expected loss per spec
            $sum: { $ifNull: ['$expectedLoss', 0] }
          }
        }
      }
    ]);

    const txStats = txAgg || {
      totalTransactions: 0,
      totalTransactionValue: 0,
      highRiskTransactions: 0,
      potentialLoss: 0,
      expectedLoss: 0
    };

    // ─── 2. Chargeback-level aggregations ───
    const [cbAgg] = await Chargeback.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalChargebacks: { $sum: 1 },
          disputedAmount: { $sum: { $ifNull: ['$amount', 0] } },
          defendedCases: {
            $sum: {
              $cond: [
                { $ne: ['$defenseSuccessProbability', null] },
                1,
                0
              ]
            }
          },
          // Successful defense = status is APPROVED, SUBMITTED, or RESOLVED
          successfulDefenses: {
            $sum: {
              $cond: [
                { $in: ['$status', ['APPROVED', 'SUBMITTED', 'RESOLVED']] },
                1,
                0
              ]
            }
          },
          // Recovered amount = amount of APPROVED + SUBMITTED + RESOLVED chargebacks
          recoveredAmount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['APPROVED', 'SUBMITTED', 'RESOLVED']] },
                { $ifNull: ['$amount', 0] },
                0
              ]
            }
          },
          // Unresolved = OPEN + UNDER_REVIEW + RESPONSE_DRAFTED + PENDING_REVIEW + REJECTED
          unresolvedAmount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['OPEN', 'UNDER_REVIEW', 'RESPONSE_DRAFTED', 'PENDING_REVIEW', 'REJECTED']
                  ]
                },
                { $ifNull: ['$amount', 0] },
                0
              ]
            }
          }
        }
      }
    ]);

    const cbStats = cbAgg || {
      totalChargebacks: 0,
      disputedAmount: 0,
      defendedCases: 0,
      successfulDefenses: 0,
      recoveredAmount: 0,
      unresolvedAmount: 0
    };

    // Derived metrics
    const chargebackRate =
      txStats.totalTransactions > 0
        ? (cbStats.totalChargebacks / txStats.totalTransactions) * 100
        : 0;
    const successfulDefenseRate =
      cbStats.defendedCases > 0
        ? (cbStats.successfulDefenses / cbStats.defendedCases) * 100
        : 0;

    // ─── 3. Chart: Transactions over time (monthly) ───
    const transactionsOverTime = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          },
          count: { $sum: 1 },
          value: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]
              }
            ]
          },
          count: 1,
          value: { $round: ['$value', 2] }
        }
      }
    ]);

    // ─── 4. Chart: Chargebacks over time (monthly) ───
    const chargebacksOverTime = await Chargeback.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          amount: { $sum: { $ifNull: ['$amount', 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]
              }
            ]
          },
          count: 1,
          amount: { $round: ['$amount', 2] }
        }
      }
    ]);

    // ─── 5. Chart: Expected loss over time (monthly) ───
    const expectedLossOverTime = await Transaction.aggregate([
      { $match: { ...matchFilter, expectedLoss: { $gt: 0 } } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          },
          expectedLoss: { $sum: { $ifNull: ['$expectedLoss', 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]
              }
            ]
          },
          expectedLoss: { $round: ['$expectedLoss', 2] }
        }
      }
    ]);

    // ─── 6. Chart: Risk-level distribution ───
    const riskLevelDistribution = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $ifNull: ['$riskLevel', 'UNSCORED'] },
          count: { $sum: 1 },
          volume: { $sum: '$amount' },
          expectedLoss: { $sum: { $ifNull: ['$expectedLoss', 0] } }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          level: '$_id',
          count: 1,
          volume: { $round: ['$volume', 2] },
          expectedLoss: { $round: ['$expectedLoss', 2] }
        }
      }
    ]);

    // ─── 7. Chart: Loss by dispute reason ───
    const lossByDisputeReason = await Chargeback.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$disputeReason',
          count: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
          avgDefenseScore: { $avg: { $ifNull: ['$defenseScore', 0] } }
        }
      },
      { $sort: { totalAmount: -1 } },
      {
        $project: {
          _id: 0,
          reason: '$_id',
          count: 1,
          totalAmount: { $round: ['$totalAmount', 2] },
          avgDefenseScore: { $round: ['$avgDefenseScore', 1] }
        }
      }
    ]);

    // ─── 8. Chart: Chargeback rate by month ───
    // Join transactions count and chargebacks count per month
    const [txMonthly, cbMonthly] = await Promise.all([
      Transaction.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Chargeback.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    const chargebackRateOverTime = txMonthly.map((tx) => {
      const key = `${tx._id.year}-${String(tx._id.month).padStart(2, '0')}`;
      const cb = cbMonthly.find(
        (c) => c._id.year === tx._id.year && c._id.month === tx._id.month
      );
      const cbCount = cb?.count || 0;
      return {
        period: key,
        rate: tx.count > 0 ? Number(((cbCount / tx.count) * 100).toFixed(2)) : 0,
        transactions: tx.count,
        chargebacks: cbCount
      };
    });

    // ─── 9. Chart: Defense success rate by month ───
    const defenseByMonth = await Chargeback.aggregate([
      { $match: { ...matchFilter, defenseSuccessProbability: { $ne: null } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalDefended: { $sum: 1 },
          successfulDefenses: {
            $sum: {
              $cond: [
                { $in: ['$status', ['APPROVED', 'SUBMITTED', 'RESOLVED']] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]
              }
            ]
          },
          rate: {
            $cond: [
              { $gt: ['$totalDefended', 0] },
              { $round: [{ $multiply: [{ $divide: ['$successfulDefenses', '$totalDefended'] }, 100] }, 1] },
              0
            ]
          },
          defended: '$totalDefended',
          successful: '$successfulDefenses'
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      merchantId: merchantId || 'ALL',
      data: {
        summary: {
          totalTransactions: txStats.totalTransactions,
          totalTransactionValue: Number(txStats.totalTransactionValue.toFixed(2)),
          totalChargebacks: cbStats.totalChargebacks,
          chargebackRate: Number(chargebackRate.toFixed(2)),
          highRiskTransactions: txStats.highRiskTransactions,
          potentialLoss: Number(txStats.potentialLoss.toFixed(2)),
          expectedLoss: Number(txStats.expectedLoss.toFixed(2)),
          disputedAmount: Number(cbStats.disputedAmount.toFixed(2)),
          defendedCases: cbStats.defendedCases,
          successfulDefenseRate: Number(successfulDefenseRate.toFixed(2)),
          recoveredAmount: Number(cbStats.recoveredAmount.toFixed(2)),
          unresolvedAmount: Number(cbStats.unresolvedAmount.toFixed(2))
        },
        charts: {
          transactionsOverTime,
          chargebacksOverTime,
          expectedLossOverTime,
          chargebackRateOverTime,
          defenseSuccessRateOverTime: defenseByMonth,
          lossByDisputeReason,
          riskLevelDistribution
        }
      }
    });
  } catch (error) {
    console.error('Loss summary analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute loss summary analytics'
    });
  }
};

export const getAdminAnalytics = async (req, res) => {
  try {
    const [
      userCounts,
      totalTransactions,
      totalChargebacks,
      riskDistribution,
      disputeStatusCounts
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Transaction.countDocuments(),
      Chargeback.countDocuments(),
      Transaction.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$riskLevel', 'UNSCORING'] },
            count: { $sum: 1 },
            volume: { $sum: '$amount' },
            expectedLoss: { $sum: { $ifNull: ['$expectedLoss', 0] } }
          }
        }
      ]),
      Chargeback.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            disputedAmount: { $sum: '$amount' }
          }
        }
      ])
    ]);

    return res.status(200).json({
      success: true,
      data: {
        systemOverview: {
          totalTransactions,
          totalChargebacks,
          userDistribution: userCounts.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
        },
        riskDistribution,
        disputeStatusCounts
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute admin analytics'
    });
  }
};

/**
 * Helper: read model metadata JSON from the models/ directory
 */
function readModelMetadata(filename) {
  const filePath = path.join(MODELS_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * GET /analytics/model-metrics
 * Returns real training metrics for Model A and Model B from saved metadata.
 * Metrics come from the actual training process — never fabricated.
 */
export const getModelMetrics = async (req, res) => {
  try {
    const metaA = readModelMetadata('model_a_metadata.json');
    const metaB = readModelMetadata('model_b_metadata.json');

    // Determine ACTIVE/INACTIVE status based on whether metadata exists
    const modelAStatus = metaA ? 'ACTIVE' : 'INACTIVE';
    const modelBStatus = metaB ? 'ACTIVE' : 'INACTIVE';

    const formatModel = (meta, status) => {
      if (!meta) {
        return { status: 'INACTIVE', model_name: null };
      }
      return {
        model_name: meta.model_name,
        algorithm: meta.algorithm,
        version: meta.version,
        training_date: meta.training_date,
        selected_threshold: meta.selected_threshold,
        total_samples: meta.total_samples,
        train_samples: meta.train_samples,
        val_samples: meta.val_samples,
        test_samples: meta.test_samples,
        feature_count: meta.features?.all_features?.length || 0,
        numerical_features: meta.features?.numerical?.length || 0,
        categorical_features: meta.features?.categorical?.length || 0,
        target: meta.target,
        test_metrics: meta.test_metrics || null,
        comparison_results: meta.comparison_results || {},
        status
      };
    };

    return res.status(200).json({
      success: true,
      data: {
        model_a: formatModel(metaA, modelAStatus),
        model_b: formatModel(metaB, modelBStatus)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load model metrics'
    });
  }
};

/**
 * GET /analytics/admin/predictions
 * Real admin analytics: prediction counts, high-risk stats, chargeback/defense outcomes,
 * prediction distribution — all from MongoDB.
 */
export const getAdminPredictionAnalytics = async (req, res) => {
  try {
    const [
      // Total predictions by model
      predictionCounts,
      // High-risk transactions (riskLevel HIGH or CRITICAL)
      highRiskAgg,
      // Chargeback outcomes by status
      chargebackOutcomes,
      // Defense outcomes (chargebacks with Model B predictions)
      defenseOutcomes,
      // Prediction probability distribution for Model A
      modelADistribution,
      // Prediction probability distribution for Model B
      modelBDistribution,
      // Prediction records count
      predictionRecordCounts
    ] = await Promise.all([
      // Total predictions by model name
      Prediction.aggregate([
        { $group: { _id: '$modelName', count: { $sum: 1 } } }
      ]),
      // High-risk transaction count
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            highRisk: {
              $sum: {
                $cond: [{ $in: ['$riskLevel', ['HIGH', 'CRITICAL']] }, 1, 0]
              }
            },
            criticalRisk: {
              $sum: {
                $cond: [{ $eq: ['$riskLevel', 'CRITICAL'] }, 1, 0]
              }
            },
            scored: {
              $sum: {
                $cond: [{ $ne: ['$riskLevel', null] }, 1, 0]
              }
            }
          }
        }
      ]),
      // Chargeback outcomes by status
      Chargeback.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
            avgDefenseScore: { $avg: { $ifNull: ['$defenseScore', null] } }
          }
        }
      ]),
      // Defense outcomes: how many chargebacks have Model B predictions and their recommendation
      Chargeback.aggregate([
        { $match: { defenseSuccessProbability: { $ne: null } } },
        {
          $group: {
            _id: '$recommendation',
            count: { $sum: 1 },
            avgDefenseProbability: { $avg: '$defenseSuccessProbability' },
            avgDefenseScore: { $avg: { $ifNull: ['$defenseScore', 0] } }
          }
        }
      ]),
      // Model A probability distribution (binned)
      Transaction.aggregate([
        { $match: { chargebackProbability: { $ne: null } } },
        {
          $bucket: {
            groupBy: '$chargebackProbability',
            boundaries: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01],
            default: 'OTHER',
            output: {
              count: { $sum: 1 },
              avgAmount: { $avg: '$amount' },
              totalAmount: { $sum: '$amount' }
            }
          }
        }
      ]),
      // Model B probability distribution (binned)
      Chargeback.aggregate([
        { $match: { defenseSuccessProbability: { $ne: null } } },
        {
          $bucket: {
            groupBy: '$defenseSuccessProbability',
            boundaries: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01],
            default: 'OTHER',
            output: {
              count: { $sum: 1 },
              avgScore: { $avg: { $ifNull: ['$defenseScore', 0] } }
            }
          }
        }
      ]),
      // Prediction collection record counts
      Prediction.aggregate([
        { $group: { _id: '$modelName', count: { $sum: 1 } } }
      ])
    ]);

    const highRisk = highRiskAgg[0] || { total: 0, highRisk: 0, criticalRisk: 0, scored: 0 };

    // Format prediction counts
    const predCounts = {};
    predictionCounts.forEach(p => { predCounts[p._id] = p.count; });

    const predRecordCounts = {};
    predictionRecordCounts.forEach(p => { predRecordCounts[p._id] = p.count; });

    // Format defense outcomes
    const defense = {};
    defenseOutcomes.forEach(d => { defense[d._id || 'UNSCORED'] = d; });

    return res.status(200).json({
      success: true,
      data: {
        predictionSummary: {
          totalModelAPredictions: predCounts['MODEL_A_CHARGEBACK_RISK'] || 0,
          totalModelBPredictions: predCounts['MODEL_B_DEFENSE_SUCCESS'] || 0,
          predictionRecords: predRecordCounts
        },
        highRiskAnalysis: {
          totalTransactions: highRisk.total,
          scoredTransactions: highRisk.scored,
          highRiskTransactions: highRisk.highRisk,
          criticalRiskTransactions: highRisk.criticalRisk,
          highRiskRate: highRisk.total > 0 ? Number(((highRisk.highRisk / highRisk.total) * 100).toFixed(2)) : 0
        },
        chargebackOutcomes: chargebackOutcomes.map(c => ({
          status: c._id,
          count: c.count,
          totalAmount: Number(c.totalAmount.toFixed(2)),
          avgDefenseScore: c.avgDefenseScore ? Number(c.avgDefenseScore.toFixed(1)) : null
        })),
        defenseOutcomes: defense,
        predictionDistribution: {
          modelA: modelADistribution.map(d => ({
            bucket: d._id === 'OTHER' ? 'OTHER' : `${d._id}`,
            count: d.count,
            avgAmount: d.avgAmount ? Number(d.avgAmount.toFixed(2)) : 0,
            totalAmount: d.totalAmount ? Number(d.totalAmount.toFixed(2)) : 0
          })),
          modelB: modelBDistribution.map(d => ({
            bucket: d._id === 'OTHER' ? 'OTHER' : `${d._id}`,
            count: d.count,
            avgScore: d.avgScore ? Number(d.avgScore.toFixed(1)) : 0
          }))
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute admin prediction analytics'
    });
  }
};
