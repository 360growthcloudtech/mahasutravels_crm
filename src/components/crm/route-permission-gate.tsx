"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { sessionAllows, type AuthSession } from "@/lib/auth";
import { useSession } from "@/lib/session-context";
import { ROUTE_VIEW_PERMISSION, viewPermissionForPath } from "@/lib/nav-permissions";
import { Button } from "@/components/ui/button";

function firstAllowedHref(session: AuthSession): string | null {
  for (const [href, key] of Object.entries(ROUTE_VIEW_PERMISSION)) {
    if (sessionAllows(session, key)) return href;
  }
  return null;
}

/** Blocks CRM pages the signed-in user is not granted to view. */
export function RoutePermissionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, loading } = useSession();

  if (loading) {
    return <div className="min-h-0 flex-1 bg-paper" aria-busy="true" />;
  }

  const required = viewPermissionForPath(pathname);
  if (!required || sessionAllows(session, required)) {
    return <>{children}</>;
  }

  const fallback = session ? firstAllowedHref(session) : null;

  return (
    <div className="page-pad flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-ink/5 text-ink/50">
        <ShieldOff className="size-6" strokeWidth={1.75} />
      </div>
      <div className="max-w-sm space-y-1">
        <h1 className="font-display text-lg font-semibold text-ink">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this page. Ask an admin to grant{" "}
          <span className="font-mono-data text-xs">{required}</span>.
        </p>
      </div>
      {fallback ? (
        <Button asChild variant="marigold" size="sm">
          <Link href={fallback}>Go to available page</Link>
        </Button>
      ) : null}
    </div>
  );
}
