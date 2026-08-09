import { getSessionFromCookies } from "@/lib/auth-server";
import type { SessionPayload } from "@/lib/auth-jwt";

export async function requireSession(): Promise<SessionPayload | null> {
  return getSessionFromCookies();
}

export function isValidIngestApiKey(request: Request) {
  const expected = process.env.LEADS_INGEST_API_KEY;
  if (!expected) return false;
  const key = request.headers.get("x-api-key");
  return Boolean(key && key === expected);
}

export async function requireIngestAuth(request: Request): Promise<
  | { kind: "api_key" }
  | { kind: "session"; session: SessionPayload }
  | null
> {
  if (isValidIngestApiKey(request)) return { kind: "api_key" };
  const session = await getSessionFromCookies();
  if (session) return { kind: "session", session };
  return null;
}

export function ingestCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = (process.env.LEADS_INGEST_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  let allowOrigin = "";
  if (allowed.length === 0) {
    allowOrigin = origin || "*";
  } else if (origin && allowed.includes(origin)) {
    allowOrigin = origin;
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (allowOrigin) headers["Access-Control-Allow-Origin"] = allowOrigin;
  return headers;
}
