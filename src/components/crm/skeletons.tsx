"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function useDrawerReady(open: boolean, delayMs = 280) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [open, delayMs]);

  return ready;
}

export function StatCardsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TableRowsSkeleton({
  columns,
  rows = 6,
  avatar = false,
}: {
  columns: number;
  rows?: number;
  avatar?: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <TableRow key={row} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((_, col) => (
            <TableCell key={col}>
              {avatar && col === 0 ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="min-w-0 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
              ) : col === columns - 1 ? (
                <div className="flex justify-end gap-2">
                  <Skeleton className="size-7 rounded-md" />
                  <Skeleton className="size-7 rounded-md" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-[72%]" />
                  <Skeleton className="h-2.5 w-[42%]" />
                </div>
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function RecordCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DrawerTimelineSkeleton({
  items = 4,
  showHeader = false,
}: {
  items?: number;
  showHeader?: boolean;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      {showHeader ? (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40" />
        </div>
      ) : null}
      <ol className="relative ml-3 space-y-0 border-l border-border-soft">
        {Array.from({ length: items }).map((_, index) => (
          <li key={index} className="relative pb-5 pl-6 last:pb-0">
            <span className="absolute top-0 -left-3.5 flex size-7 items-center justify-center rounded-full border border-border bg-card">
              <Skeleton className="size-5 rounded-full" />
            </span>
            <div className="space-y-2 rounded-md border border-border-soft bg-secondary/30 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-2.5 w-20 shrink-0" />
              </div>
              <Skeleton className="h-3 w-[78%]" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DrawerCommentsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="space-y-2 rounded-md border border-border-soft bg-secondary/40 px-3 py-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-20 shrink-0" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[70%]" />
        </div>
      ))}
    </div>
  );
}

export function DrawerFormSkeleton({
  sections = 3,
  fieldsPerSection = 4,
}: {
  sections?: number;
  fieldsPerSection?: number;
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {Array.from({ length: sections }).map((_, section) => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: fieldsPerSection }).map((_, field) => (
              <div key={field} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
