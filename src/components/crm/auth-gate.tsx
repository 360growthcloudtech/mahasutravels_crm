"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";

/** Keep auth ready across Soft Navigations if Shell remounts. */
let authReadyCache = false;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = React.useState(authReadyCache);

  React.useEffect(() => {
    if (authReadyCache) {
      setReady(true);
      return;
    }
    let cancelled = false;
    getSession().then((session) => {
      if (cancelled) return;
      if (!session) {
        authReadyCache = false;
        router.replace("/login");
        return;
      }
      authReadyCache = true;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return <div className="min-h-dvh bg-paper" aria-busy="true" />;
  }

  return <>{children}</>;
}
