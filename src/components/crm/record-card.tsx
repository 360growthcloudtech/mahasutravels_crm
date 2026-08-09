import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function InfoItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-medium tracking-wide text-slate-soft uppercase">{label}</p>
      <div className="mt-0.5 break-words text-sm text-ink-text">{children}</div>
    </div>
  );
}

export function InfoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}

export function RecordCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="space-y-3 p-4">{children}</CardContent>
    </Card>
  );
}
