import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { transactionService } from '../../services/api';
import { RiskBadge } from '../../components/ui/Badges';
import { LoadingState, ErrorState } from '../../components/ui/ModalsAndStates';
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Loader2,
  AlertTriangle,
  Flame,
  Info,
  TrendingDown,
  CreditCard
} from 'lucide-react';

export default function TransactionDetailPage() {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transactionService.getById(id);
      if (res.data.success) {
        setTransaction(res.data.data);
        setCustomer(res.data.customer || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleRunRiskAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await transactionService.predictRisk(transaction.transactionId || transaction._id);
      if (res.data.success) {
        // Update local transaction state with new predictions
        setTransaction((prev) => ({
          ...prev,
          chargebackProbability: res.data.data.probability,
          riskScore: res.data.data.risk_score,
          riskLevel: res.data.data.risk_level,
          expectedLoss: res.data.data.expected_loss,
          modelVersion: res.data.data.model_version
        }));
      }
    } catch (err) {
      setAnalysisError(err.response?.data?.message || err.message || 'Risk inference failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <LoadingState message="Fetching transaction metadata & risk breakdown..." />;
  if (error) return <ErrorState error={error} retry={fetchDetails} />;
  if (!transaction) return <ErrorState error="Transaction not found" />;

  // Factual Risk Driver Explanation based ONLY on available input features
  const riskSignals = [];

  if (transaction.isInternational) {
    riskSignals.push({
      type: 'warning',
      text: 'Cross-Border Transaction: International authorization increases jurisdiction dispute friction.'
    });
  }
  if (!transaction.ipCountryMatch) {
    riskSignals.push({
      type: 'danger',
      text: 'IP Geolocation Mismatch: IP address location does not match billing country.'
    });
  }
  if (!transaction.billingShippingMatch) {
    riskSignals.push({
      type: 'danger',
      text: 'Address Discrepancy: Shipping address differs from registered cardholder billing address.'
    });
  }
  if (transaction.multipleAccountsSameDevice) {
    riskSignals.push({
      type: 'danger',
      text: 'Device Footprint Alert: Multiple account entities identified sharing this device identifier.'
    });
  }
  if (transaction.ordersLast24h > 2) {
    riskSignals.push({
      type: 'warning',
      text: `Elevated Velocity: Customer initiated ${transaction.ordersLast24h} orders within a 24-hour window.`
    });
  }
  if (customer && customer.customerChargebackRate > 0) {
    riskSignals.push({
      type: 'danger',
      text: `Customer Dispute History: Customer has a historical chargeback rate of ${(customer.customerChargebackRate * 100).toFixed(1)}%.`
    });
  }
  if (transaction.otpVerified && transaction.deliveryConfirmed) {
    riskSignals.push({
      type: 'positive',
      text: 'Mitigating Proof: 2-Factor OTP verified and proof of delivery confirmed.'
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/merchant/transactions"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">Transaction {transaction.transactionId}</h1>
              <RiskBadge level={transaction.riskLevel} score={transaction.riskScore} />
            </div>
            <p className="text-xs text-slate-400">Ingested on {new Date(transaction.timestamp).toLocaleString()}</p>
          </div>
        </div>

        {/* Trigger Model A Analysis */}
        <button
          onClick={handleRunRiskAnalysis}
          disabled={analyzing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Evaluating Model A...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Run Risk Analysis</span>
            </>
          )}
        </button>
      </div>

      {analysisError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {/* Model A Intelligence & Loss Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Model A: Transaction Chargeback Risk Intelligence</h3>
              <p className="text-xs text-slate-400">
                Model Version: <span className="text-slate-200 font-mono">{transaction.modelVersion || 'v1.0.0 (Trained)'}</span>
              </p>
            </div>
          </div>
          <RiskBadge level={transaction.riskLevel} score={transaction.riskScore} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Chargeback Probability</span>
            <div className="text-xl font-extrabold text-amber-400 mt-1">
              {transaction.chargebackProbability !== null && transaction.chargebackProbability !== undefined
                ? `${(transaction.chargebackProbability * 100).toFixed(1)}%`
                : 'Not Evaluated'}
            </div>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Risk Score</span>
            <div className="text-xl font-extrabold text-slate-100 mt-1">
              {transaction.riskScore !== null && transaction.riskScore !== undefined
                ? `${transaction.riskScore} / 100`
                : '—'}
            </div>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Assigned Risk Level</span>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">
              {transaction.riskLevel || 'UNSCORED'}
            </div>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Expected Merchant Loss</span>
            <div className="text-xl font-extrabold text-rose-400 mt-1">
              ${Number(transaction.expectedLoss || 0).toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">prob * amount</span>
          </div>
        </div>
      </div>

      {/* Verified Feature Explanations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">Factual Risk Driver Signals</h3>
        </div>
        <p className="text-xs text-slate-400">Grounded exclusively on the actual ingested transaction & customer features.</p>

        {riskSignals.length === 0 ? (
          <div className="p-3 bg-slate-800/40 rounded-lg text-xs text-slate-400">
            Standard baseline transaction characteristics. No anomalous flags detected.
          </div>
        ) : (
          <div className="space-y-2">
            {riskSignals.map((sig, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                  sig.type === 'danger'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                    : sig.type === 'warning'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                }`}
              >
                {sig.type === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                {sig.type === 'warning' && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
                {sig.type === 'positive' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                <span>{sig.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Financial */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 text-xs">
          <h4 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">Financial Breakdown</h4>
          <div className="flex justify-between text-slate-400"><span>Gross Amount:</span><strong className="text-slate-100">${Number(transaction.amount).toFixed(2)}</strong></div>
          <div className="flex justify-between text-slate-400"><span>Payment Method:</span><span className="text-slate-200">{transaction.paymentMethod}</span></div>
          <div className="flex justify-between text-slate-400"><span>Amount vs Customer Avg:</span><span className="text-slate-200">{transaction.amountVsCustomerAvg}x</span></div>
        </div>

        {/* Customer & Velocity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 text-xs">
          <h4 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">Customer Velocity</h4>
          <div className="flex justify-between text-slate-400"><span>Customer ID:</span><span className="font-mono text-slate-200">{transaction.customerId}</span></div>
          <div className="flex justify-between text-slate-400"><span>Orders Last 24h:</span><span className="text-slate-200">{transaction.ordersLast24h}</span></div>
          <div className="flex justify-between text-slate-400"><span>Device Age:</span><span className="text-slate-200">{transaction.deviceAgeDays} days</span></div>
        </div>

        {/* Verification Checks */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 text-xs">
          <h4 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">Security Verification</h4>
          <div className="flex justify-between items-center text-slate-400">
            <span>IP Country Match:</span>
            {transaction.ipCountryMatch ? <span className="text-emerald-400 font-semibold">Match</span> : <span className="text-rose-400 font-semibold">Mismatch</span>}
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Billing/Shipping Match:</span>
            {transaction.billingShippingMatch ? <span className="text-emerald-400 font-semibold">Match</span> : <span className="text-rose-400 font-semibold">Mismatch</span>}
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>OTP Verification:</span>
            {transaction.otpVerified ? <span className="text-emerald-400 font-semibold">Verified</span> : <span className="text-slate-400">None</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
