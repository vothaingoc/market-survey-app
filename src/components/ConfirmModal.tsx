import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  idPrefix?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy',
  isDanger = true,
  onConfirm,
  onCancel,
  idPrefix = 'confirm-modal',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            id={`${idPrefix}-backdrop`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            id={`${idPrefix}-card`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-white border border-slate-100 rounded-2xl p-5 shadow-2xl w-full max-w-xs flex flex-col space-y-4 text-center z-10"
          >
            {/* Warning Icon */}
            <div className="mx-auto bg-amber-50 border border-amber-100 p-3 rounded-full text-amber-500 w-12 h-12 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            {/* Title & Message */}
            <div className="space-y-1">
              <h3 id={`${idPrefix}-title`} className="text-base font-bold text-slate-900 leading-snug">
                {title}
              </h3>
              <p id={`${idPrefix}-message`} className="text-xs text-slate-500 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id={`${idPrefix}-btn-cancel`}
                type="button"
                onClick={onCancel}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                {cancelText}
              </button>
              <button
                id={`${idPrefix}-btn-confirm`}
                type="button"
                onClick={onConfirm}
                className={`w-full py-2 text-white text-xs font-bold rounded-xl transition-all ${
                  isDanger
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
