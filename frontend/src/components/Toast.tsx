import React from "react";
import { CheckCircle2, Info, AlertCircle, X } from "lucide-react";
import { ToastMessage } from "../types";

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-up ${
              isSuccess
                ? "bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-500/10"
                : isError
                ? "bg-slate-900/95 border-red-500/40 text-slate-100 shadow-red-500/10"
                : "bg-slate-900/95 border-cyan-500/40 text-slate-100 shadow-cyan-500/10"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-cyan-400" />}
            </div>

            <div className="flex-1 text-xs leading-relaxed font-semibold">
              {toast.message}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-0.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
