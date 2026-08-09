export type AuthSession = {
  memberId: string;
  name: string;
  email: string;
  role: string;
};

type LoginResult = { ok: true } | { ok: false; error: string };

export async function getSession(): Promise<AuthSession | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      user?: { id: string; name: string; email: string; role: string };
    };
    if (!data.user) return null;
    return {
      memberId: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
    };
  } catch {
    return null;
  }
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
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to sign in. Please try again." };
  }
}

export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } finally {
    window.location.href = "/login";
  }
}
