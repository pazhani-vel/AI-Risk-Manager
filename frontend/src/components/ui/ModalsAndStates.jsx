import React from 'react';
import { Loader2, Inbox, AlertTriangle, X } from 'lucide-react';

export function LoadingState({ message = 'Loading risk data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-slate-900/40 rounded-xl border border-slate-800/80">
      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

export function EmptyState({ title = 'No records found', message = 'No data matching your current filters or criteria.' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800/80">
      <div className="p-3 bg-slate-800 rounded-full mb-3 text-slate-500">
        <Inbox className="w-6 h-6" />
      </div>
      <h4 className="text-base font-medium text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ error, retry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
      <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
      <h4 className="text-sm font-semibold text-rose-300">Data Fetch Error</h4>
      <p className="text-xs text-rose-400/80 mt-1">{error || 'An unexpected error occurred.'}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-3 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, confirmText = 'Confirm', isDanger = false }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        <p className="text-sm text-slate-400 mt-2">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition ${
              isDanger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
