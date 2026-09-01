import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { chargebackService } from '../../services/api';
import { StatusBadge, RiskBadge } from '../../components/ui/Badges';
import { LoadingState, ErrorState } from '../../components/ui/ModalsAndStates';
import {
  ArrowLeft,
  Shield,
  Scale,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
  Layers,
  TrendingUp,
  FileCheck,
  MessageSquare,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function ReviewerChargebackDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [chargeback, setChargeback] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reviewer decision state
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [actioning, setActioning] = useState(null); // 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchData = async () => {
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
      }
      if (evRes.data.success) {
        setEvidence(evRes.data.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dispute data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const verifiedEvidence = evidence.filter((e) => e.verificationStatus === 'VERIFIED');

  const handleReviewAction = async (action) => {
    if ((action === 'REQUEST_CHANGES' || action === 'REJECT') && !reviewerNotes.trim()) {
      setActionError('Reviewer notes are required for this action.');
      return;
    }
    setActioning(action);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await chargebackService.review(
        chargeback.chargebackId || chargeback._id,
        action,
        reviewerNotes
      );
      if (res.data.success) {
        setChargeback((prev) => ({
          ...prev,
          status: res.data.data.status,
          reviewStatus: res.data.data.reviewStatus,
          reviewerNotes: res.data.data.reviewerNotes,
          reviewedAt: res.data.data.reviewedAt
        }));
        setActionSuccess(
          action === 'APPROVE'
            ? 'Rebuttal response APPROVED. Case is ready for bank submission.'
            : action === 'REQUEST_CHANGES'
            ? 'Changes requested. Case returned to analyst for revision.'
            : 'Response REJECTED. Case has been flagged and analyst notified.'
        );
        setReviewerNotes('');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Review action failed');
    } finally {
      setActioning(null);
    }
  };

  if (loading) return <LoadingState message="Loading dispute for review..." />;
  if (error) return <ErrorState error={error} retry={fetchData} />;
  if (!chargeback) return <ErrorState error="Dispute not found" />;

  const isPendingReview = chargeback.status === 'PENDING_REVIEW';
  const isDecided = ['APPROVED', 'REJECTED'].includes(chargeback.reviewStatus);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/reviewer/pending" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">Review: {chargeback.chargebackId}</h1>
              <StatusBadge status={chargeback.status} />
              <StatusBadge status={chargeback.reviewStatus} />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Transaction: {chargeback.transactionId} • Reason: {chargeback.disputeReason}
            </p>
          </div>
        </div>
      </div>

      {/* Action Success / Error Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Reviewer Notes — if previously decided */}
      {chargeback.reviewerNotes && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <MessageSquare className="w-4 h-4" />
            <span>Reviewer Notes / Decision Rationale</span>
          </div>
          <p className="text-amber-200 leading-relaxed">{chargeback.reviewerNotes}</p>
          {chargeback.reviewedAt && (
            <p className="text-amber-400/60 text-[11px]">Reviewed at: {new Date(chargeback.reviewedAt).toLocaleString()}</p>
          )}
        </div>
      )}

      {/* AI Non-Approval Notice */}
      <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg text-[11px] text-slate-400 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>
          <strong className="text-amber-300">Human-in-the-Loop Control:</strong> AI never auto-approves or auto-submits dispute responses.
          All decisions require your explicit review and sign-off below.
        </span>
      </div>

      {/* ML Intelligence Cards (READ-ONLY — reviewers cannot modify predictions) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Disputed Amount</div>
          <div className="text-2xl font-extrabold text-slate-100">${Number(chargeback.amount).toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">{chargeback.disputeReason}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-400" />Model A Risk Prob [READ-ONLY]</div>
          <div className="text-2xl font-extrabold text-amber-400">
            {chargeback.chargebackProbability !== null && chargeback.chargebackProbability !== undefined
              ? `${(chargeback.chargebackProbability * 100).toFixed(1)}%`
              : transaction?.chargebackProbability !== null && transaction?.chargebackProbability !== undefined
              ? `${(transaction.chargebackProbability * 100).toFixed(1)}%`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Expected Loss: <strong className="text-rose-400">${Number(chargeback.expectedLoss || transaction?.expectedLoss || 0).toFixed(2)}</strong></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-purple-400" />Model B Defense Prob [READ-ONLY]</div>
          <div className="text-2xl font-extrabold text-purple-400">
            {chargeback.defenseSuccessProbability !== null && chargeback.defenseSuccessProbability !== undefined
              ? `${(chargeback.defenseSuccessProbability * 100).toFixed(1)}%`
              : 'Pending'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Score: <strong className="text-slate-200">{chargeback.defenseScore !== null && chargeback.defenseScore !== undefined ? `${chargeback.defenseScore}/100` : '—'}</strong></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5 text-emerald-400" />Evidence Score [READ-ONLY]</div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {chargeback.evidenceScore !== null && chargeback.evidenceScore !== undefined ? `${chargeback.evidenceScore}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified: <strong className="text-emerald-300">{verifiedEvidence.length}</strong> / {evidence.length} items</div>
        </div>
      </div>

      {/* Verified Evidence Items */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100">Verified Evidence ({verifiedEvidence.length} verified of {evidence.length} total)</h3>
        </div>
        {verifiedEvidence.length === 0 ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
            <AlertTriangle className="w-4 h-4 inline mr-1.5" />
            No verified evidence attached. This may weaken the defense rebuttal.
          </div>
        ) : (
          <div className="space-y-2">
            {verifiedEvidence.map((ev) => (
              <div key={ev._id} className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-mono font-semibold text-emerald-300">{ev.type}</span>
                  <p className="text-slate-300 mt-0.5">{ev.description}</p>
                  {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                    <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                      {Object.entries(ev.metadata).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI-Generated Rebuttal (READ-ONLY) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">AI-Generated Rebuttal Draft [READ-ONLY]</h3>
            <p className="text-xs text-slate-400">Reviewer cannot modify the LLM draft. Reviewers may only approve, request changes, or reject.</p>
          </div>
        </div>
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap min-h-[180px]">
          {chargeback.generatedResponse ||
            'No rebuttal letter has been drafted for this dispute yet. The analyst should generate a response before submission for review.'}
        </div>
      </div>

      {/* Reviewer Decision Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">Reviewer Decision</h3>
            <p className="text-xs text-slate-400">
              Make an explicit decision. Required for REQUEST_CHANGES and REJECT. Optional for APPROVE.
            </p>
          </div>
        </div>

        {isDecided ? (
          <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-300 space-y-2">
            <p className="font-semibold">Decision already recorded.</p>
            <p>Review Status: <strong className="text-purple-300">{chargeback.reviewStatus}</strong></p>
            {chargeback.reviewedAt && (
              <p>Decided at: <strong>{new Date(chargeback.reviewedAt).toLocaleString()}</strong></p>
            )}
          </div>
        ) : !isPendingReview ? (
          <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-400">
            Review actions are only available when the dispute is in <strong className="text-amber-400">PENDING_REVIEW</strong> status.
            Current status: <strong className="text-slate-200">{chargeback.status}</strong>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Reviewer Notes / Decision Rationale
                <span className="text-slate-500 font-normal ml-1">(Required for REQUEST_CHANGES and REJECT)</span>
              </label>
              <textarea
                rows="4"
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Enter your review rationale, feedback to the analyst, or rejection reason here..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap gap-3 justify-end pt-2">
              {/* REQUEST CHANGES */}
              <button
                onClick={() => handleReviewAction('REQUEST_CHANGES')}
                disabled={actioning !== null}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
              >
                {actioning === 'REQUEST_CHANGES' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>
                ) : (
                  <><RotateCcw className="w-4 h-4" /><span>Request Changes (Return to Analyst)</span></>
                )}
              </button>

              {/* REJECT */}
              <button
                onClick={() => handleReviewAction('REJECT')}
                disabled={actioning !== null}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
              >
                {actioning === 'REJECT' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>
                ) : (
                  <><XCircle className="w-4 h-4" /><span>Reject Response</span></>
                )}
              </button>

              {/* APPROVE */}
              <button
                onClick={() => handleReviewAction('APPROVE')}
                disabled={actioning !== null || !chargeback.generatedResponse}
                title={!chargeback.generatedResponse ? 'A rebuttal draft must exist before approval' : ''}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
              >
                {actioning === 'APPROVE' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /><span>Approve Rebuttal</span></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}