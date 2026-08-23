"use client";

import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="flex w-56 flex-col gap-2 rounded-lg border border-border bg-card px-5 py-4 shadow-lg">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-40" />
        <p className="mt-1 text-sm font-medium text-ink-text">{label}</p>
      </div>
    </div>
  );
}
