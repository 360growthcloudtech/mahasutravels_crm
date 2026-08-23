import type { PublicUser } from "@/lib/db/users";

export type UserApi = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  auto_assign_website: string | null;
};

export async function fetchUsers(opts?: { all?: boolean }): Promise<UserApi[]> {
  const qs = opts?.all ? "?all=1" : "";
  const res = await fetch(`/api/users${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load users");
  const data = (await res.json()) as { users?: UserApi[] };
  return data.users ?? [];
}

export async function updateUserAutoAssignWebsite(
  id: string,
  autoAssignWebsite: string | null
): Promise<UserApi> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auto_assign_website: autoAssignWebsite }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update user");
  }
  const data = (await res.json()) as { user: UserApi };
  return data.user;
}

export function userFromApi(u: PublicUser | UserApi): UserApi {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: "status" in u && u.status ? u.status : "Active",
    auto_assign_website: u.auto_assign_website ?? null,
  };
}
