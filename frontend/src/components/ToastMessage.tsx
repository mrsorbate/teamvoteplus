import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { ToastState } from '../lib/useToast';

interface ToastMessageProps {
  toast: ToastState | null;
  positionClassName?: string;
  textClassName?: string;
}

const CONFIG = {
  success: { Icon: CheckCircle,   border: 'border-green-700/60',   iconCls: 'text-green-400'  },
  error:   { Icon: XCircle,       border: 'border-red-700/60',     iconCls: 'text-red-400'    },
  warning: { Icon: AlertTriangle, border: 'border-yellow-600/60',  iconCls: 'text-yellow-400' },
  info:    { Icon: Info,          border: 'border-blue-700/60',    iconCls: 'text-blue-400'   },
} as const;

const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function ToastMessage({
  toast,
  positionClassName = 'bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[60]',
  textClassName = '',
}: ToastMessageProps) {
  const prefersReducedMotion = useReducedMotion();
  const fromBottom = positionClassName.includes('bottom');
  const yOffset = prefersReducedMotion ? 0 : (fromBottom ? 10 : -10);
  const cfg = toast ? CONFIG[toast.type] : null;
  const Icon = cfg?.Icon;

  return (
    <div className={`fixed ${positionClassName}`}>
      <AnimatePresence>
        {toast && cfg && Icon && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: yOffset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: yOffset }}
            transition={{ duration: 0.22, ease: EASE_EXPO }}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-gray-900/95 backdrop-blur-sm shadow-modal sm:max-w-sm ${cfg.border} ${textClassName}`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${cfg.iconCls}`} aria-hidden="true" />
            <p className="text-sm font-medium text-white leading-snug">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
