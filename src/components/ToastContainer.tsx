import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[420px] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.variant === 'error'
            ? AlertCircle
            : toast.variant === 'success'
              ? CheckCircle2
              : Info;
        const accentClass =
          toast.variant === 'error'
            ? 'bg-[#991B1B] text-white'
            : 'bg-[#111827] text-white';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-medium ${accentClass}`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${
                toast.variant === 'success'
                  ? 'text-emerald-400'
                  : toast.variant === 'error'
                    ? 'text-red-200'
                    : 'text-[#FF9259]'
              }`}
              aria-hidden="true"
            />
            <span className="leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
