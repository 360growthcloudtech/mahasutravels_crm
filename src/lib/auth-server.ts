import { cookies } from "next/headers";
import {
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth-jwt";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions());
  // Drop legacy cookie if present (pre–Firebase Hosting cookie name).
  cookieStore.delete(LEGACY_SESSION_COOKIE);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(LEGACY_SESSION_COOKIE);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SESSION_COOKIE)?.value ||
    cookieStore.get(LEGACY_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
