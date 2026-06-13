import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  message: string;
  type: ToastType;
}

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

export default function ToastMessage({
  toast,
  positionClassName = 'bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[60]',
  textClassName = '',
}: ToastMessageProps) {
  const [displayed, setDisplayed] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    if (toast) {
      setDisplayed(toast);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      exitTimer.current = setTimeout(() => setDisplayed(null), 300);
    }
    return () => { if (exitTimer.current) clearTimeout(exitTimer.current); };
  }, [toast]);

  if (!displayed) return null;

  const { Icon, border, iconCls } = CONFIG[displayed.type];
  const fromBottom = positionClassName.includes('bottom');
  const motionCls = visible
    ? 'opacity-100 translate-y-0'
    : fromBottom
      ? 'opacity-0 translate-y-3'
      : 'opacity-0 -translate-y-3';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed ${positionClassName}`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-gray-900/95 backdrop-blur-sm shadow-modal transition-all duration-200 ease-out-expo sm:max-w-sm ${border} ${motionCls} ${textClassName}`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${iconCls}`} />
        <p className="text-sm font-medium text-white leading-snug">{displayed.message}</p>
      </div>
    </div>
  );
}
