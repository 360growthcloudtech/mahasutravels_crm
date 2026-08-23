import type { SessionPayload } from "@/lib/auth-jwt";

/** Super Admin bypasses permission checks. Others need an explicit JWT grant. */
export function sessionHasPermission(session: SessionPayload, key: string): boolean {
  if (session.role === "Super Admin") return true;
  return session.permissions.includes(key);
}
