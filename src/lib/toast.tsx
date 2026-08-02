"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant: "success" | "error" | "info";
};

type ToastCtx = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = React.createContext<ToastCtx | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = ++idCounter;
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const dismiss = (id: number) => setToasts((cur) => cur.filter((x) => x.id !== id));

  const icon = { success: CheckCircle2, error: XCircle, info: Info };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icon[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-3.5 shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200",
                t.variant === "success" && "border-teal/30",
                t.variant === "error" && "border-signal/30",
                t.variant === "info" && "border-violet/30"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4.5 shrink-0",
                  t.variant === "success" && "text-teal",
                  t.variant === "error" && "text-signal",
                  t.variant === "info" && "text-violet"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-text">{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-slate-soft hover:text-slate">
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
