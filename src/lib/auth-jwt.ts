import { SignJWT, jwtVerify } from "jose";

/**
 * Must be `__session` when the app is behind Firebase Hosting → Cloud Run.
 * Hosting strips every cookie except `__session` before forwarding to Cloud Run.
 * @see https://firebase.google.com/docs/hosting/manage-cache#using_cookies
 */
export const SESSION_COOKIE = "__session";
/** Legacy cookie name — clear on logout so old browsers don't keep a dead session. */
export const LEGACY_SESSION_COOKIE = "mahasu_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  role: string;
  /** Explicit grants from `user_permissions` at login / refresh. */
  permissions: string[];
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

function readPermissions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((k): k is string => typeof k === "string");
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({
    name: payload.name,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      permissions: readPermissions(payload.permissions),
    };
  } catch {
    return null;
  }
}
