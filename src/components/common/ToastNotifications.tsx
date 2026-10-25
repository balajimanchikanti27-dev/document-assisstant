import React from 'react';
import { useToast, ToastType } from '../../context/ToastContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-brand-500 shrink-0" />,
};

const borderMap: Record<ToastType, string> = {
  success: 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/90 dark:bg-emerald-950/40',
  error: 'border-red-200 dark:border-red-900/50 bg-red-50/90 dark:bg-red-950/40',
  warning: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/40',
  info: 'border-brand-200 dark:border-brand-900/50 bg-brand-50/90 dark:bg-brand-950/40',
};

export const ToastNotifications: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 ${borderMap[toast.type]}`}
        >
          {iconMap[toast.type]}
          <div className="flex-1 text-sm">
            {toast.title && (
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-0.5">
                {toast.title}
              </h4>
            )}
            <p className="text-neutral-700 dark:text-neutral-300 leading-snug">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-0.5 rounded"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
