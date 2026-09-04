import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = "info") => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  const toast = {
    success: (msg) => push(msg, "success"),
    error: (msg) => push(msg, "danger"),
    info: (msg) => push(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const styles = {
    success: { border: "border-state-success/40", icon: <CheckCircle2 size={16} className="text-state-success" /> },
    danger: { border: "border-state-danger/40", icon: <AlertTriangle size={16} className="text-state-danger" /> },
    info: { border: "border-signal/40", icon: <Info size={16} className="text-signal" /> },
  }[toast.variant];

  return (
    <div
      className={`flex items-start gap-2.5 rounded-md border ${styles.border} bg-panel-raised px-3.5 py-3 shadow-lg animate-[fadeIn_0.15s_ease-out]`}
      role="status"
    >
      <div className="mt-0.5">{styles.icon}</div>
      <p className="flex-1 text-sm text-ink leading-snug">{toast.message}</p>
      <button onClick={onDismiss} className="text-ink-faint hover:text-ink-muted" aria-label="Dismiss notification">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
