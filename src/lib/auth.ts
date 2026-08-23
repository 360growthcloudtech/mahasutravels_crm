export type AuthSession = {
  memberId: string;
  name: string;
  email: string;
  role: string;
  permissionKeys: string[];
};

type LoginResult = { ok: true } | { ok: false; error: string };

/** `undefined` = not fetched yet; `null` = unauthenticated. */
let cachedSession: AuthSession | null | undefined = undefined;
let inflight: Promise<AuthSession | null> | null = null;

function parseUser(data: unknown): AuthSession | null {
  const body = data as {
    user?: {
      id: string;
      name: string;
      email: string;
      role: string;
      permission_keys?: string[];
    };
  };
  if (!body.user) return null;
  return {
    memberId: body.user.id,
    name: body.user.name,
    email: body.user.email,
    role: body.user.role,
    permissionKeys: body.user.permission_keys ?? [],
  };
}

async function fetchMe(refresh: boolean): Promise<AuthSession | null> {
  try {
    const url = refresh ? "/api/auth/me?refresh=1" : "/api/auth/me";
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    return parseUser(await res.json());
  } catch {
    return null;
  }
}

/** Drop in-memory session so the next getSession() hits the network. */
export function clearSessionCache() {
  cachedSession = undefined;
  inflight = null;
}

/**
 * Shared client session fetch. Concurrent callers share one in-flight request.
 * Pass `{ refresh: true }` to reload grants from the DB (`/api/auth/me?refresh=1`).
 */
export async function getSession(opts?: { refresh?: boolean }): Promise<AuthSession | null> {
  if (opts?.refresh) {
    clearSessionCache();
    inflight = fetchMe(true).then((session) => {
      cachedSession = session;
      inflight = null;
      return session;
    });
    return inflight;
  }

  if (cachedSession !== undefined) return cachedSession;
  if (inflight) return inflight;

  inflight = fetchMe(false).then((session) => {
    cachedSession = session;
    inflight = null;
    return session;
  });
  return inflight;
}

/** Force a DB-backed permission refresh and update the client cache. */
export async function refreshSession(): Promise<AuthSession | null> {
  return getSession({ refresh: true });
}

export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: data?.error ?? "Invalid email or password." };
    }
    clearSessionCache();
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to sign in. Please try again." };
  }
}

export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } finally {
    clearSessionCache();
    window.location.href = "/login";
  }
}

/** Client-side check against JWT permission keys from `/api/auth/me`. */
export function sessionAllows(session: AuthSession | null, key: string): boolean {
  if (!session) return false;
  if (session.role === "Super Admin") return true;
  return session.permissionKeys.includes(key);
}
