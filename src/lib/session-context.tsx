"use client";

import * as React from "react";
import {
  getSession,
  refreshSession as refreshSessionApi,
  type AuthSession,
} from "@/lib/auth";

type SessionContextValue = {
  session: AuthSession | null;
  loading: boolean;
  /** Load session from JWT (uses shared cache / single in-flight request). */
  reloadSession: () => Promise<AuthSession | null>;
  /** Reload grants from DB and refresh the JWT cookie. */
  refreshSession: () => Promise<AuthSession | null>;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [loading, setLoading] = React.useState(true);

  const reloadSession = React.useCallback(async () => {
    setLoading(true);
    try {
      const next = await getSession();
      setSession(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = React.useCallback(async () => {
    setLoading(true);
    try {
      const next = await refreshSessionApi();
      setSession(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await getSession();
      if (!cancelled) {
        setSession(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo(
    () => ({ session, loading, reloadSession, refreshSession }),
    [session, loading, reloadSession, refreshSession]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
