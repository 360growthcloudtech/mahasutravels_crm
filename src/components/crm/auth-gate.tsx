"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session-context";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, loading } = useSession();

  React.useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  if (loading || !session) {
    return <div className="min-h-dvh bg-paper" aria-busy="true" />;
  }

  return <>{children}</>;
}
