export type AuthSession = {
  memberId: string;
  name: string;
  email: string;
  role: string;
};

const AUTH_KEY = "mahasu-crm-auth";

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_KEY);
}

export function logout() {
  clearSession();
  window.location.href = "/login";
}
