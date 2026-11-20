import React from 'react';
import { AlertTriangle, ArrowLeft, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { formatSar } from '../utils/accounting';

interface ImbalanceToastProps {
  visible: boolean;
  balanceDiffHalalas: number;
  onGoToSmartCheck: () => void;
  onDismiss: () => void;
}

export const ImbalanceToast: React.FC<ImbalanceToastProps> = ({
  visible,
  balanceDiffHalalas,
  onGoToSmartCheck,
  onDismiss,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="no-print fixed bottom-5 left-5 right-5 sm:right-auto z-50 sm:w-[420px] bg-white border border-amber-300 rounded-xl shadow-lg p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-900">
                  تنبيه: معادلة المركز المالي غير متوازنة
                </h3>
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label="إغلاق التنبيه"
                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                يوجد فرق حالي قدره{' '}
                <span className="font-mono-num font-bold text-red-700" dir="ltr">
                  {formatSar(balanceDiffHalalas)}
                </span>{' '}
                بين الأصول وإجمالي الخصوم وحقوق الملكية. يُنصح بالانتقال إلى المرحلة الخامسة لفحص ميزان المراجعة ومواءمة الأرقام آلياً.
              </p>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onGoToSmartCheck}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>الانتقال إلى المرحلة الخامسة (الفحص الذكي)</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
