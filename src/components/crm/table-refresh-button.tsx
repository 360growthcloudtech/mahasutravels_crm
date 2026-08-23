"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TableRefreshButtonProps = {
  onRefresh: () => void | Promise<void>;
  loading?: boolean;
  label?: string;
  className?: string;
};

/** Reloads table data from the API. */
export function TableRefreshButton({
  onRefresh,
  loading = false,
  label = "Refresh",
  className,
}: TableRefreshButtonProps) {
  const [pending, setPending] = React.useState(false);
  const busy = loading || pending;

  async function handleClick() {
    if (busy) return;
    setPending(true);
    try {
      await onRefresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => void handleClick()}
      className={cn(className)}
      aria-label={label}
    >
      <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
