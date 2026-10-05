"use client";

// A short message above the tab bar, e.g. "Chicken adobo logged · 420 kcal" with Undo.
// It disappears after a few seconds. Screen readers hear it too.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastData = { id: number; message: string; actionLabel?: string; onAction?: () => void };

const ToastContext = createContext<(t: Omit<ToastData, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const VISIBLE_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  const show = useCallback((t: Omit<ToastData, "id">) => {
    setToast({ ...t, id: nextId.current++ });
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), VISIBLE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-4"
        style={{ bottom: "calc(var(--safe-bottom) + 84px)" }}
      >
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex min-h-12 w-full max-w-sm items-center gap-3 rounded-[var(--radius-control)] bg-ink py-1.5 pr-1.5 pl-4 text-bg shadow-float"
            style={{ animation: "fade-in var(--dur) var(--ease-out)" }}
          >
            <p className="text-body tabular min-w-0 flex-1">{toast.message}</p>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                className="text-headline min-h-11 rounded-[10px] px-3 text-bg underline-offset-4 hover:underline"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
