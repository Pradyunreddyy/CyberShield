import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useExitTransition } from "../hooks/useExitTransition";

const ToastContext = createContext(null);

let idCounter = 0;

// Errors stay longer: they are the ones a person may need to read twice.
const DURATION = { success: 4500, info: 4500, danger: 9000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, variant = "info") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
  }, []);

  const toast = {
    success: (msg) => push(msg, "success"),
    error: (msg) => push(msg, "danger"),
    info: (msg) => push(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [open, setOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const { mounted, state } = useExitTransition(open, 160);

  // Auto-dismiss, paused while the pointer or keyboard focus is on the toast.
  useEffect(() => {
    if (paused || !open) return undefined;
    const t = setTimeout(() => setOpen(false), DURATION[toast.variant] || 4500);
    return () => clearTimeout(t);
  }, [paused, open, toast.variant]);

  // Once the exit animation has played, remove it from the list.
  useEffect(() => {
    if (!mounted) onDismiss();
  }, [mounted, onDismiss]);

  const styles = {
    success: { border: "border-state-success/40", icon: <CheckCircle2 size={16} className="text-state-success" /> },
    danger: { border: "border-state-danger/50", icon: <AlertTriangle size={16} className="text-state-danger" /> },
    info: { border: "border-signal/40", icon: <Info size={16} className="text-signal" /> },
  }[toast.variant];

  return (
    <div
      data-state={state}
      role={toast.variant === "danger" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`exit-slide pointer-events-auto flex w-full items-start gap-2.5 rounded-md border ${styles.border} bg-panel-raised px-3.5 py-3 shadow-overlay animate-slide-in`}
    >
      <div className="mt-0.5" aria-hidden="true">
        {styles.icon}
      </div>
      <p className="flex-1 text-sm leading-snug text-ink">{toast.message}</p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors duration-120 hover:bg-hairline hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
