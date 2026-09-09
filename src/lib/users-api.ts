import type { PublicUser } from "@/lib/db/users";

export type UserApi = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  auto_assign_websites: string[];
  permission_count?: number;
  permission_keys?: string[];
};

export type PermissionApi = {
  key: string;
  module: string;
  action: string;
  label: string;
  description?: string;
  sort_order: number;
};

export type UsersListQuery = {
  search?: string;
  role?: string[];
  status?: string[];
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  colFilters?: Array<Record<string, unknown>>;
};

export type UsersListPaginationApi = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type UsersListResponse = {
  users: UserApi[];
  pagination: UsersListPaginationApi;
};

export type PermissionsListQuery = {
  search?: string;
  module?: string[];
  action?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  colFilters?: Array<Record<string, unknown>>;
};

export type PermissionsListPaginationApi = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type PermissionsListResponse = {
  permissions: PermissionApi[];
  myPermissionKeys: string[];
  pagination: PermissionsListPaginationApi;
};

export async function fetchUsers(opts?: { all?: boolean }): Promise<UserApi[]> {
  const qs = opts?.all ? "?all=1" : "";
  const res = await fetch(`/api/users${qs}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load users");
  const data = (await res.json()) as { users?: UserApi[] };
  return data.users ?? [];
}

export async function fetchUsersPage(query: UsersListQuery = {}): Promise<UsersListResponse> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.role?.length) params.set("role", query.role.join(","));
  if (query.status?.length) params.set("status", query.status.join(","));
  if (query.includeInactive) params.set("include_inactive", "1");
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  if (query.colFilters?.length) params.set("colFilters", JSON.stringify(query.colFilters));
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 25));
  const qs = params.toString();
  const res = await fetch(`/api/users?${qs}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to load users");
  }
  const data = (await res.json()) as UsersListResponse;
  return {
    users: data.users ?? [],
    pagination: data.pagination ?? {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      total: data.users?.length ?? 0,
      totalPages: 1,
      hasMore: false,
    },
  };
}

export async function fetchPermissionsCatalog(): Promise<{
  permissions: PermissionApi[];
  myPermissionKeys: string[];
}> {
  const res = await fetch("/api/permissions?all=1", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load permissions");
  const data = (await res.json()) as {
    permissions?: PermissionApi[];
    my_permission_keys?: string[];
  };
  return {
    permissions: data.permissions ?? [],
    myPermissionKeys: data.my_permission_keys ?? [],
  };
}

export async function fetchPermissionsPage(
  query: PermissionsListQuery = {}
): Promise<PermissionsListResponse> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.module?.length) params.set("module", query.module.join(","));
  if (query.action?.length) params.set("action", query.action.join(","));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  if (query.colFilters?.length) params.set("colFilters", JSON.stringify(query.colFilters));
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 25));
  const qs = params.toString();
  const res = await fetch(`/api/permissions?${qs}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to load permissions");
  }
  const data = (await res.json()) as {
    permissions?: PermissionApi[];
    my_permission_keys?: string[];
    pagination?: PermissionsListPaginationApi;
  };
  return {
    permissions: data.permissions ?? [],
    myPermissionKeys: data.my_permission_keys ?? [],
    pagination: data.pagination ?? {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      total: data.permissions?.length ?? 0,
      totalPages: 1,
      hasMore: false,
    },
  };
}

export async function updateUserAutoAssignWebsites(
  id: string,
  autoAssignWebsites: string[]
): Promise<UserApi> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auto_assign_websites: autoAssignWebsites }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update user");
  }
  const data = (await res.json()) as { user: UserApi };
  return data.user;
}

export async function updateUserPermissionKeys(
  id: string,
  permissionKeys: string[]
): Promise<string[]> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permission_keys: permissionKeys }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update permissions");
  }
  const data = (await res.json()) as { permission_keys?: string[] };
  return data.permission_keys ?? [];
}

export function userFromApi(u: PublicUser | UserApi): UserApi {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: "status" in u && u.status ? u.status : "Active",
    auto_assign_websites: u.auto_assign_websites ?? [],
    permission_count: "permission_count" in u ? u.permission_count : undefined,
    permission_keys: "permission_keys" in u ? u.permission_keys : undefined,
  };
}
