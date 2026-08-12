"use client";

import { cn } from "@/lib/utils";

export function BusyOverlay({
  show,
  label = "Saving…",
  className,
}: {
  show: boolean;
  label?: string;
  className?: string;
}) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center bg-ink/25 backdrop-blur-[1px]",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-5 shadow-lg">
        <div
          className="size-8 animate-spin rounded-full border-2 border-border-soft border-t-marigold"
          aria-hidden
        />
        <p className="text-sm font-medium text-ink-text">{label}</p>
      </div>
    </div>
  );
}
