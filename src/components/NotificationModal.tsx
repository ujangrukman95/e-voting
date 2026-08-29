import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface NotificationModalProps {
  isOpen: boolean;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  showCancel?: boolean;
}

export function NotificationModal({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  onClose,
  showCancel = false,
}: NotificationModalProps) {
  if (!isOpen) return null;

  const handleDismiss = onClose || onCancel;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50 dark:ring-emerald-900/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50 dark:ring-rose-900/30">
            <AlertCircle className="w-9 h-9" />
          </div>
        );
      case 'warning':
      case 'confirm':
        return (
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-amber-50/50 dark:ring-amber-900/30">
            <AlertTriangle className="w-9 h-9" />
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-cyan-50/50 dark:ring-cyan-900/30">
            <Info className="w-9 h-9" />
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden"
        >
          {handleDismiss && (
            <button
              id="btn-close-notification-modal"
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {getIcon()}

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 font-display">{title}</h3>
          
          <div className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
            {message}
          </div>

          <div className="flex gap-3 justify-center">
            {(showCancel || type === 'confirm') && (
              <button
                id="btn-modal-cancel"
                type="button"
                onClick={handleDismiss}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
            )}
            <button
              id="btn-modal-confirm"
              type="button"
              onClick={onConfirm || handleDismiss}
              className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white shadow-xs transition-colors cursor-pointer ${
                type === 'error'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : type === 'warning' || type === 'confirm'
                  ? 'bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500'
                  : 'bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
