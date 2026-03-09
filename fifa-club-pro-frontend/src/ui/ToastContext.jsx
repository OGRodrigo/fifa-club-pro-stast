import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let toastIdCounter = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((message, type = "info", duration = 3000) => {
    const id = toastIdCounter++;
    const toast = { id, message, type };

    setToasts((prev) => [...prev, toast]);

    window.setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, [removeToast]);

  const success = useCallback((message, duration) => {
    pushToast(message, "success", duration);
  }, [pushToast]);

  const error = useCallback((message, duration) => {
    pushToast(message, "error", duration);
  }, [pushToast]);

  const info = useCallback((message, duration) => {
    pushToast(message, "info", duration);
  }, [pushToast]);

  const value = useMemo(() => ({
    success,
    error,
    info,
    removeToast,
  }), [success, error, info, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onClose }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }) {
  const styles = getToastStyles(toast.type);

  return (
    <div
      className={`pointer-events-auto rounded-2xl border bg-fifa-card px-4 py-4 shadow-glow backdrop-blur ${styles.ring}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-lg">{styles.icon}</div>

        <div className="min-w-0 flex-1">
          <div className={`text-sm font-extrabold tracking-wide ${styles.titleColor}`}>
            {styles.title}
          </div>
          <div className="mt-1 text-sm text-[var(--fifa-text)]">
            {toast.message}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onClose(toast.id)}
          className="rounded-lg px-2 py-1 text-xs font-bold text-[var(--fifa-mute)] hover:bg-black/20"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function getToastStyles(type) {
  if (type === "success") {
    return {
      icon: "✅",
      title: "ÉXITO",
      ring: "border-[rgba(0,255,194,0.25)] ring-1 ring-[rgba(0,255,194,0.20)]",
      titleColor: "text-[var(--fifa-neon)]",
    };
  }

  if (type === "error") {
    return {
      icon: "❌",
      title: "ERROR",
      ring: "border-[rgba(255,77,109,0.25)] ring-1 ring-[rgba(255,77,109,0.20)]",
      titleColor: "text-[var(--fifa-danger)]",
    };
  }

  return {
    icon: "ℹ️",
    title: "INFO",
    ring: "border-[rgba(74,222,255,0.25)] ring-1 ring-[rgba(74,222,255,0.20)]",
    titleColor: "text-[var(--fifa-cyan)]",
  };
}