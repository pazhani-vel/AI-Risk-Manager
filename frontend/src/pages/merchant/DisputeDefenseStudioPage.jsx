import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { chargebackService, evidenceService } from '../../services/api';
import { StatusBadge } from '../../components/ui/Badges';
import { LoadingState, ErrorState, Modal } from '../../components/ui/ModalsAndStates';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Scale,
  Shield,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  Loader2,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowRight,
  Info,
  Check,
  X,
  Trash2,
  Eye,
  Plus,
  FileCheck,
  AlertCircle,
  Sparkles,
  Edit3,
  Save,
  Send,
  Clock,
  Cpu
} from 'lucide-react';

const EVIDENCE_TYPES = [
  { value: 'PAYMENT', label: 'Payment Gateway Authorization' },
  { value: 'AUTHENTICATION', label: '3D Secure / Identity Auth' },
  { value: 'DELIVERY', label: 'Proof of Delivery (Signed POD)' },
  { value: 'TRACKING', label: 'Carrier Tracking Confirmation' },
  { value: 'OTP', label: 'One-Time Password (2FA) Logs' },
  { value: 'ADDRESS', label: 'AVS & Billing/Shipping Match' },
  { value: 'CUSTOMER_HISTORY', label: 'Historical Order Logs & KYC' },
  { value: 'ORDER', label: 'Itemized Order Invoice & Receipt' },
  { value: 'REFUND', label: 'Refund Policy & Terms Acknowledgement' }
];

export default function DisputeDefenseStudioPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [chargeback, setChargeback] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [evidenceStats, setEvidenceStats] = useState({
    totalCount: 0,
    verifiedCount: 0,
    unverifiedCount: 0,
    rejectedCount: 0,
    completenessScore: 0,
    verifiedCategories: [],
    missingCategories: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Model B execution state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(null);

  // LLM Response Generation state
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generationSuccess, setGenerationSuccess] = useState(null);
  const [llmMetadata, setLlmMetadata] = useState(null);

  // Draft Edit Mode
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editableDraft, setEditableDraft] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  // Status transition state
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Evidence Action State
  const [evidenceActionLoading, setEvidenceActionLoading] = useState(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    type: 'DELIVERY',
    description: '',
    source: 'MERCHANT_UPLOAD',
    carrier: 'FedEx',
    trackingNumber: '',
    ipAddress: '',
    authCode: ''
  });

  // Evidence detail modal
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const isAnalystOrPrivileged = ['ADMIN', 'RISK_ANALYST', 'REVIEWER'].includes(user?.role);

  const fetchDisputeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cbRes, evRes] = await Promise.all([
        chargebackService.getById(id),
        chargebackService.getEvidence(id)
      ]);

      if (cbRes.data.success) {
        setChargeback(cbRes.data.data);
        setTransaction(cbRes.data.transaction || null);
        setEditableDraft(cbRes.data.data.generatedResponse || '');
      }
      if (evRes.data.success) {
        setEvidenceList(evRes.data.data || []);
        if (evRes.data.stats) {
          setEvidenceStats(evRes.data.stats);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load dispute resolution studio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputeData();
  }, [id]);

  // Model B Trigger
  const handleRunDefenseAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(null);
    try {
      const res = await chargebackService.predictDefense(chargeback.chargebackId || chargeback._id);
      if (res.data.success) {
        setChargeback((prev) => ({
          ...prev,
          defenseSuccessProbability: res.data.data.probability,
          defenseScore: res.data.data.defense_score,
          recommendation: res.data.data.recommendation,
          modelVersion: res.data.data.model_version,
          evidenceScore: Number((res.data.data.evidence_completeness * 100).toFixed(1)),
          status: prev.status === 'OPEN' ? 'UNDER_REVIEW' : prev.status
        }));
        setAnalysisSuccess('Model B Defense Intelligence evaluated successfully.');
      }
    } catch (err) {
      setAnalysisError(err.response?.data?.message || err.message || 'Defense inference failed');
    } finally {
      setAnalyzing(false);
    }
  };

  // Phase 12: Generate Evidence-Grounded Rebuttal via LLM
  const handleGenerateResponse = async () => {
    setGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);
    try {
      const res = await chargebackService.generateResponse(chargeback.chargebackId || chargeback._id);
      if (res.data.success) {
        setChargeback((prev) => ({
          ...prev,
          generatedResponse: res.data.data.generatedDraft,
          status: prev.status === 'OPEN' || prev.status === 'UNDER_REVIEW' ? 'RESPONSE_DRAFTED' : prev.status
        }));
        setEditableDraft(res.data.data.generatedDraft);
        setLlmMetadata({
          model: res.data.data.model,
          provider: res.data.data.provider,
          generatedAt: res.data.data.generatedAt,
          evidenceUsed: res.data.data.evidenceUsed,
          missingCategories: res.data.data.missingCategories
        });
        setGenerationSuccess('Evidence-grounded rebuttal response draft generated successfully.');
        setIsEditingDraft(false);
      }
    } catch (err) {
      setGenerationError(err.response?.data?.message || err.message || 'Failed to generate rebuttal response');
    } finally {
      setGenerating(false);
    }
  };

  // Save Manual Rebuttal Edits
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const res = await chargebackService.update(chargeback.chargebackId || chargeback._id, {
        generatedResponse: editableDraft
      });
      if (res.data.success) {
        setChargeback((prev) => ({ ...prev, generatedResponse: editableDraft }));
        setIsEditingDraft(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save rebuttal draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // State Transition Trigger (Send for Review, Approve, Reject, Submit, Resolve)
  const handleTransitionStatus = async (newStatus) => {
    setStatusUpdating(true);
    setStatusError(null);
    try {
      const res = await chargebackService.updateStatus(chargeback.chargebackId || chargeback._id, newStatus);
      if (res.data.success) {
        setChargeback(res.data.data);
      }
    } catch (err) {
      setStatusError(err.response?.data?.message || err.message || 'Status transition failed');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Evidence Verification / Rejection Action
  const handleUpdateEvidenceStatus = async (evidenceId, newVerificationStatus) => {
    setEvidenceActionLoading(evidenceId);
    try {
      const res = await evidenceService.update(evidenceId, {
        verificationStatus: newVerificationStatus
      });
      if (res.data.success) {
        const evRes = await chargebackService.getEvidence(chargeback.chargebackId || chargeback._id);
        if (evRes.data.success) {
          setEvidenceList(evRes.data.data || []);
          if (evRes.data.stats) {
            setEvidenceStats(evRes.data.stats);
          }
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update evidence status');
    } finally {
      setEvidenceActionLoading(null);
    }
  };

  // Delete Evidence Item
  const handleDeleteEvidence = async (evidenceId) => {
    if (!window.confirm('Are you sure you want to delete this evidence record?')) return;
    setEvidenceActionLoading(evidenceId);
    try {
      const res = await evidenceService.delete(evidenceId);
      if (res.data.success) {
        const evRes = await chargebackService.getEvidence(chargeback.chargebackId || chargeback._id);
        if (evRes.data.success) {
          setEvidenceList(evRes.data.data || []);
          if (evRes.data.stats) {
            setEvidenceStats(evRes.data.stats);
          }
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete evidence item');
    } finally {
      setEvidenceActionLoading(null);
    }
  };

  // Evidence Upload Form Submit
  const handleEvidenceSubmit = async (e) => {
    e.preventDefault();
    try {
      const metadata = {};
      if (evidenceForm.carrier) metadata.carrier = evidenceForm.carrier;
      if (evidenceForm.trackingNumber) metadata.trackingNumber = evidenceForm.trackingNumber;
      if (evidenceForm.ipAddress) metadata.ipAddress = evidenceForm.ipAddress;
      if (evidenceForm.authCode) metadata.authCode = evidenceForm.authCode;

      await chargebackService.createEvidence(chargeback.chargebackId || chargeback._id, {
        type: evidenceForm.type,
        description: evidenceForm.description,
        source: evidenceForm.source,
        verificationStatus: isAnalystOrPrivileged ? 'VERIFIED' : 'UNVERIFIED',
        metadata
      });

      setIsUploadOpen(false);
      setEvidenceForm({
        type: 'DELIVERY',
        description: '',
        source: 'MERCHANT_UPLOAD',
        carrier: 'FedEx',
        trackingNumber: '',
        ipAddress: '',
        authCode: ''
      });

      fetchDisputeData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to attach evidence');
    }
  };

  if (loading) return <LoadingState message="Loading Dispute Resolution Studio..." />;
  if (error) return <ErrorState error={error} retry={fetchDisputeData} />;
  if (!chargeback) return <ErrorState error="Dispute record not found" />;

  const workflowStages = [
    'OPEN',
    'UNDER_REVIEW',
    'RESPONSE_DRAFTED',
    'PENDING_REVIEW',
    'APPROVED',
    'SUBMITTED',
    'RESOLVED'
  ];

  const currentStageIndex = workflowStages.indexOf(chargeback.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/merchant/chargebacks" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">Dispute Defense: {chargeback.chargebackId}</h1>
              <StatusBadge status={chargeback.status} />
              <StatusBadge status={chargeback.reviewStatus} />
            </div>
            <p className="text-xs text-slate-400">
              Transaction Ref: <span className="font-mono text-slate-300">{chargeback.transactionId}</span> • Reason: <span className="font-medium text-slate-200">{chargeback.disputeReason}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Evidence</span>
          </button>

          <button
            onClick={handleRunDefenseAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating Model B...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Defense Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {analysisError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {analysisSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{analysisSuccess}</span>
        </div>
      )}

      {generationError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{generationError}</span>
        </div>
      )}

      {generationSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{generationSuccess}</span>
        </div>
      )}

      {statusError && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{statusError}</span>
        </div>
      )}

      {/* State Machine Status Progression Stepper */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Dispute Lifecycle Workflow</span>
          </div>
          <span className="text-[11px] text-slate-400">Strict state transitions with human review</span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {workflowStages.map((st, idx) => {
            const isCompleted = currentStageIndex > idx;
            const isCurrent = chargeback.status === st;
            return (
              <div
                key={st}
                className={`py-2 px-1 rounded text-[10px] font-mono font-semibold transition ${
                  isCurrent
                    ? 'bg-purple-600 text-white shadow'
                    : isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800/40 text-slate-500 border border-slate-800'
                }`}
              >
                {st}
              </div>
            );
          })}
        </div>
      </div>

      {/* Telemetry Overview: Financial, Model A, Model B */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Disputed Amount</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-100">${Number(chargeback?.amount || 0).toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">Reason: {chargeback.disputeReason}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Model A Risk Prob</span>
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">
            {chargeback.chargebackProbability !== null && chargeback.chargebackProbability !== undefined
              ? `${(chargeback.chargebackProbability * 100).toFixed(1)}%`
              : (transaction?.chargebackProbability !== null && transaction?.chargebackProbability !== undefined)
              ? `${(transaction.chargebackProbability * 100).toFixed(1)}%`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Expected Loss: <strong className="text-rose-400">${Number(chargeback?.expectedLoss || transaction?.expectedLoss || 0).toFixed(2)}</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Model B Defense Prob</span>
            <Scale className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400">
            {chargeback.defenseSuccessProbability !== null && chargeback.defenseSuccessProbability !== undefined
              ? `${(chargeback.defenseSuccessProbability * 100).toFixed(1)}%`
              : 'Pending'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Score: <strong className="text-slate-200">{chargeback.defenseScore !== null && chargeback.defenseScore !== undefined ? `${chargeback.defenseScore}/100` : '—'}</strong>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Defense Recommendation</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold mt-1">
            {chargeback.recommendation === 'STRONG_DEFENSE' ? (
              <span className="text-emerald-400">STRONG DEFENSE</span>
            ) : chargeback.recommendation === 'REVIEW_REQUIRED' ? (
              <span className="text-amber-400">REVIEW REQUIRED</span>
            ) : chargeback.recommendation === 'WEAK_DEFENSE' ? (
              <span className="text-rose-400">WEAK DEFENSE</span>
            ) : (
              <span className="text-slate-500">Awaiting Model B</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Model Version: <span className="font-mono text-slate-300">{chargeback.modelVersion || 'v1.0.0'}</span>
          </div>
        </div>
      </div>

      {/* Evidence Completeness Score Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Evidence Strength & Completeness Portfolio</h3>
              <p className="text-[11px] text-slate-400">Only verified documents contribute to legal dispute defense strength</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-slate-400">Total Items: <strong className="text-slate-200">{evidenceStats.totalCount}</strong></span>
            <span className="text-emerald-400">Verified: <strong>{evidenceStats.verifiedCount}</strong></span>
            <span className="text-amber-400">Unreviewed: <strong>{evidenceStats.unverifiedCount}</strong></span>
            <span className="text-rose-400">Rejected: <strong>{evidenceStats.rejectedCount}</strong></span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Defense Evidence Completeness Score</span>
            <span className="font-mono text-emerald-400 text-sm">{evidenceStats.completenessScore}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                evidenceStats.completenessScore >= 70
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : evidenceStats.completenessScore >= 40
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-rose-500 to-red-400'
              }`}
              style={{ width: `${Math.min(evidenceStats.completenessScore, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 space-y-2">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Verified Evidence Categories ({evidenceStats.verifiedCategories?.length || 0})</span>
            </span>
            {evidenceStats.verifiedCategories && evidenceStats.verifiedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {evidenceStats.verifiedCategories.map((cat) => (
                  <span key={cat} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-mono">
                    {cat}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No evidence categories verified yet.</p>
            )}
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 space-y-2">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Missing Evidence Categories ({evidenceStats.missingCategories?.length || 0})</span>
            </span>
            {evidenceStats.missingCategories && evidenceStats.missingCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {evidenceStats.missingCategories.map((cat) => (
                  <span key={cat} className="px-2 py-0.5 bg-slate-700/60 text-slate-300 border border-slate-600 rounded text-[11px] font-mono">
                    {cat}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-emerald-400 font-semibold">All standard evidence categories verified!</p>
            )}
          </div>
        </div>
      </div>

      {/* Attached Evidence Vault Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-slate-100">Evidence Vault Items ({evidenceList.length})</h3>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Evidence</span>
          </button>
        </div>

        {evidenceList.length === 0 ? (
          <div className="p-6 bg-slate-800/30 rounded-lg text-center text-xs text-slate-400 space-y-2">
            <p>No evidence records attached to this dispute yet.</p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 font-semibold transition"
            >
              Upload Initial Evidence Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Description & Metadata</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Added Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {evidenceList.map((ev) => (
                  <tr key={ev._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded font-mono font-semibold text-[11px]">
                        {ev.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-medium text-slate-200 truncate">{ev.description || 'No description'}</div>
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                          {Object.entries(ev.metadata).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">{ev.source}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={ev.verificationStatus} />
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {new Date(ev.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedEvidence(ev)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {isAnalystOrPrivileged && ev.verificationStatus !== 'VERIFIED' && (
                          <button
                            onClick={() => handleUpdateEvidenceStatus(ev._id, 'VERIFIED')}
                            disabled={evidenceActionLoading === ev._id}
                            className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded"
                            title="Verify Evidence"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isAnalystOrPrivileged && ev.verificationStatus !== 'REJECTED' && (
                          <button
                            onClick={() => handleUpdateEvidenceStatus(ev._id, 'REJECTED')}
                            disabled={evidenceActionLoading === ev._id}
                            className="p-1.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/30 rounded"
                            title="Reject Evidence"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteEvidence(ev._id)}
                          disabled={evidenceActionLoading === ev._id}
                          className="p-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30 rounded"
                          title="Delete Evidence"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PHASE 12: Evidence-Grounded Dispute Rebuttal & Human Review Studio */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Evidence-Grounded Dispute Rebuttal</h3>
              <p className="text-xs text-slate-400">AI synthesizes response draft based strictly on verified evidence records</p>
            </div>
          </div>

          {/* Generate Response Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateResponse}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Grounded Rebuttal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Response</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generation Metadata & Provenance Banner */}
        {(llmMetadata || chargeback.generatedResponse) && (
          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300 font-mono">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Engine: <strong className="text-slate-100">{llmMetadata?.model || 'claude-3-5-sonnet-20241022'}</strong> ({llmMetadata?.provider || 'Anthropic'})</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Generated: {llmMetadata?.generatedAt ? new Date(llmMetadata.generatedAt).toLocaleString() : 'Active Draft'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>Verified Items Cited: <strong className="text-emerald-400">{evidenceStats.verifiedCount}</strong></span>
            </div>
          </div>
        )}

        {/* Editor vs Preview Mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Rebuttal Letter Draft</span>
            <div className="flex items-center gap-2">
              {isEditingDraft ? (
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingDraft ? 'Saving...' : 'Save Edits'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingDraft(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit Response Draft</span>
                </button>
              )}
            </div>
          </div>

          {isEditingDraft ? (
            <textarea
              rows="14"
              value={editableDraft}
              onChange={(e) => setEditableDraft(e.target.value)}
              className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
            ></textarea>
          ) : (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap min-h-[220px]">
              {chargeback.generatedResponse ||
                `[NO REBUTTAL DRAFT GENERATED YET]\n` +
                `Click 'Generate Response' above to formulate an evidence-grounded dispute rebuttal letter using the ${evidenceStats.verifiedCount} verified evidence item(s).`
              }
            </div>
          )}
        </div>

        {/* Human-in-the-loop Controls & Send for Review */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Workflow Status:</span>
              <strong className="text-slate-200 font-mono">{chargeback.status}</strong>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Review State:</span>
              <strong className="text-slate-200 font-mono">{chargeback.reviewStatus}</strong>
            </div>
            <span className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Mandatory human sign-off required prior to bank submission.</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 justify-end pt-2">
            {/* Send for Review action from drafted state */}
            {(chargeback.status === 'RESPONSE_DRAFTED' || chargeback.status === 'UNDER_REVIEW' || chargeback.status === 'OPEN') && chargeback.generatedResponse && (
              <button
                onClick={() => handleTransitionStatus('PENDING_REVIEW')}
                disabled={statusUpdating}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send for Review (PENDING_REVIEW)</span>
              </button>
            )}

            {/* Reviewer / Admin Decisions */}
            {chargeback.status === 'PENDING_REVIEW' && (
              <>
                <button
                  onClick={() => handleTransitionStatus('REJECTED')}
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Reject Rebuttal
                </button>
                <button
                  onClick={() => handleTransitionStatus('APPROVED')}
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Approve Rebuttal
                </button>
              </>
            )}

            {chargeback.status === 'REJECTED' && (
              <button
                onClick={() => handleTransitionStatus('UNDER_REVIEW')}
                disabled={statusUpdating}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                Re-open for Evidence Adjustment
              </button>
            )}

            {chargeback.status === 'APPROVED' && (
              <button
                onClick={() => handleTransitionStatus('SUBMITTED')}
                disabled={statusUpdating}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                <span>Submit Rebuttal to Acquiring Bank</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {chargeback.status === 'SUBMITTED' && (
              <button
                onClick={() => handleTransitionStatus('RESOLVED')}
                disabled={statusUpdating}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition"
              >
                Mark Dispute as RESOLVED
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Evidence Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Attach Verified Dispute Evidence">
        <form className="space-y-4" onSubmit={handleEvidenceSubmit}>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Evidence Type</label>
            <select
              value={evidenceForm.type}
              onChange={(e) => setEvidenceForm({ ...evidenceForm, type: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
            >
              {EVIDENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value} — {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Evidence Description & Findings</label>
            <textarea
              rows="3"
              required
              value={evidenceForm.description}
              onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
              placeholder="Describe what this document proves (e.g. Cardholder signed delivery receipt on 2026-08-15)..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
            ></textarea>
          </div>

          {['DELIVERY', 'TRACKING'].includes(evidenceForm.type) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Carrier Name</label>
                <input
                  type="text"
                  value={evidenceForm.carrier}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, carrier: e.target.value })}
                  placeholder="FedEx / UPS / DHL"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={evidenceForm.trackingNumber}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, trackingNumber: e.target.value })}
                  placeholder="e.g. 789123456012"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>
            </div>
          )}

          {['AUTHENTICATION', 'OTP', 'PAYMENT'].includes(evidenceForm.type) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Auth / Gateway Code</label>
                <input
                  type="text"
                  value={evidenceForm.authCode}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, authCode: e.target.value })}
                  placeholder="AUTH-998822"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">IP Geolocation</label>
                <input
                  type="text"
                  value={evidenceForm.ipAddress}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, ipAddress: e.target.value })}
                  placeholder="192.168.1.1 (US)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow"
            >
              Attach Evidence
            </button>
          </div>
        </form>
      </Modal>

      {/* Evidence Details Modal */}
      {selectedEvidence && (
        <Modal isOpen={Boolean(selectedEvidence)} onClose={() => setSelectedEvidence(null)} title={`Evidence Details: ${selectedEvidence.type}`}>
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Verification Status</span>
              <StatusBadge status={selectedEvidence.verificationStatus} />
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Description</span>
              <p className="p-2.5 bg-slate-800 rounded text-slate-200">{selectedEvidence.description || 'No description provided.'}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Metadata Attributes</span>
              <pre className="p-2.5 bg-slate-950 rounded text-slate-300 font-mono overflow-x-auto text-[11px]">
                {JSON.stringify(selectedEvidence.metadata || {}, null, 2)}
              </pre>
            </div>
            <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
              <span>Source: {selectedEvidence.source}</span>
              <span>Added: {new Date(selectedEvidence.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}