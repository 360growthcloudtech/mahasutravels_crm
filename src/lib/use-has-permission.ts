"use client";

import { sessionAllows } from "@/lib/auth";
import { useSession } from "@/lib/session-context";

/**
 * Returns whether the signed-in user may use a permission key.
 * Super Admin always true. Others use grants from the shared session.
 */
export function useHasPermission(key: string): boolean {
  const { session } = useSession();
  return sessionAllows(session, key);
}
