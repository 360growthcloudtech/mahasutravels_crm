import { query, getPool } from "@/lib/db";
import type { GridColumnFilter } from "@/lib/api/grid-query";
import { ensureLeadWebhookSchema } from "@/lib/db/ensure-lead-webhook-schema";
import {
  appendGridColumnFilterClauses,
  buildGridOrderBy,
  type GridSqlColumn,
} from "@/lib/db/grid-sql";
import { resolveWebsiteDomain } from "@/lib/db/masters";

/** Allowlisted column ids for AG Grid sort / column filters on users. */
export const USER_GRID_SQL_COLUMNS: Record<string, GridSqlColumn> = {
  name: { expr: "u.name", kind: "text" },
  email: { expr: "u.email", kind: "text" },
  role: { expr: "u.role", kind: "text" },
  status: { expr: "u.status", kind: "text" },
};

export const USER_GRID_SORT_COLUMNS = Object.keys(USER_GRID_SQL_COLUMNS);

export const USER_GRID_FILTER_ALLOWLIST = Object.fromEntries(
  Object.entries(USER_GRID_SQL_COLUMNS).map(([id, col]) => [
    id,
    col.kind === "number" ? ("number" as const) : ("text" as const),
  ])
);

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  auto_assign_websites: string[];
  permission_count?: number;
  permission_keys?: string[];
};

export type ListUsersFilters = {
  search?: string;
  role?: string[];
  status?: string[];
  /** When false, only Active users (default for non-settings lists). */
  includeInactive?: boolean;
  sortBy?: string | null;
  sortDir?: "asc" | "desc" | null;
  colFilters?: GridColumnFilter[];
};

export type ListUsersPageResult = {
  rows: PublicUser[];
  total: number;
};

function normalizeWebsiteList(domains: string[] | null | undefined): string[] {
  if (!domains?.length) return [];
  return [...new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean))].sort();
}

function mapPublicUser(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  auto_assign_websites?: string[] | null;
}): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    auto_assign_websites: normalizeWebsiteList(row.auto_assign_websites),
  };
}

async function attachAutoAssignWebsites<T extends { id: string }>(
  users: T[]
): Promise<(T & { auto_assign_websites: string[] })[]> {
  if (users.length === 0) return [];
  const ids = users.map((u) => u.id);
  const { rows } = await query<{ user_id: string; website_domain: string }>(
    `SELECT user_id, website_domain
     FROM user_auto_assign_websites
     WHERE user_id = ANY($1::uuid[])
     ORDER BY website_domain ASC`,
    [ids]
  );
  const byUser = new Map<string, string[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row.website_domain);
    byUser.set(row.user_id, list);
  }
  return users.map((u) => ({
    ...u,
    auto_assign_websites: byUser.get(u.id) ?? [],
  }));
}

export async function findUserByEmail(email: string): Promise<(UserRow & { auto_assign_websites: string[] }) | null> {
  await ensureLeadWebhookSchema();
  const { rows } = await query<UserRow>(
    `SELECT id, name, email, password_hash, role, status
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email]
  );
  const user = rows[0];
  if (!user) return null;
  const [withWebsites] = await attachAutoAssignWebsites([user]);
  return withWebsites;
}

export async function findUserById(id: string): Promise<(UserRow & { auto_assign_websites: string[] }) | null> {
  await ensureLeadWebhookSchema();
  const { rows } = await query<UserRow>(
    `SELECT id, name, email, password_hash, role, status
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  const user = rows[0];
  if (!user) return null;
  const [withWebsites] = await attachAutoAssignWebsites([user]);
  return withWebsites;
}

export async function listActiveUsers(): Promise<PublicUser[]> {
  await ensureLeadWebhookSchema();
  const { rows } = await query<UserRow>(
    `SELECT id, name, email, role, status
     FROM users
     WHERE status = 'Active'
     ORDER BY name ASC`
  );
  const withWebsites = await attachAutoAssignWebsites(rows);
  return withWebsites.map((u) => mapPublicUser(u));
}

/** All users (any status) — for settings sync of auto-assign websites. */
export async function listUsers(): Promise<PublicUser[]> {
  await ensureLeadWebhookSchema();
  const { rows } = await query<UserRow>(
    `SELECT id, name, email, role, status
     FROM users
     ORDER BY name ASC`
  );
  const withWebsites = await attachAutoAssignWebsites(rows);
  return withWebsites.map((u) => mapPublicUser(u));
}

function buildUsersFilterClauses(filters: ListUsersFilters): {
  clauses: string[];
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (!filters.includeInactive) {
    clauses.push(`u.status = 'Active'`);
  }
  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(u.name) LIKE $${params.length}
        OR lower(u.email) LIKE $${params.length}
        OR lower(u.role) LIKE $${params.length})`
    );
  }
  if (filters.role?.length) {
    params.push(filters.role);
    clauses.push(`u.role = ANY($${params.length}::text[])`);
  }
  if (filters.status?.length) {
    params.push(filters.status);
    clauses.push(`u.status = ANY($${params.length}::text[])`);
  }
  if (filters.colFilters?.length) {
    appendGridColumnFilterClauses(filters.colFilters, USER_GRID_SQL_COLUMNS, clauses, params);
  }

  return { clauses, params };
}

function usersOrderBy(filters: ListUsersFilters): string {
  return buildGridOrderBy(
    filters.sortBy && filters.sortDir
      ? { sortBy: filters.sortBy, sortDir: filters.sortDir }
      : null,
    USER_GRID_SQL_COLUMNS,
    "u.name ASC"
  );
}

export async function listUsersPage(
  filters: ListUsersFilters = {},
  options: { limit: number; offset: number }
): Promise<ListUsersPageResult> {
  await ensureLeadWebhookSchema();
  const limit = Math.min(Math.max(Math.floor(options.limit) || 25, 1), 100);
  const offset = Math.max(Math.floor(options.offset) || 0, 0);
  const { clauses, params } = buildUsersFilterClauses(filters);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM users u ${where}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  if (total === 0 || offset >= total) {
    return { rows: [], total };
  }

  const { rows } = await query<UserRow & { permission_count: string | number }>(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       u.status,
       COALESCE(pc.cnt, 0)::int AS permission_count
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*)::int AS cnt
       FROM user_permissions
       GROUP BY user_id
     ) pc ON pc.user_id = u.id
     ${where}
     ORDER BY ${usersOrderBy(filters)}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const withWebsites = await attachAutoAssignWebsites(rows);
  const ids = withWebsites.map((u) => u.id);
  const { rows: permRows } = await query<{ user_id: string; permission_key: string }>(
    `SELECT user_id, permission_key
     FROM user_permissions
     WHERE user_id = ANY($1::uuid[])
     ORDER BY permission_key ASC`,
    [ids]
  );
  const keysByUser = new Map<string, string[]>();
  for (const row of permRows) {
    const list = keysByUser.get(row.user_id) ?? [];
    list.push(row.permission_key);
    keysByUser.set(row.user_id, list);
  }

  return {
    rows: withWebsites.map((u) => ({
      ...mapPublicUser(u),
      permission_count: Number(u.permission_count) || keysByUser.get(u.id)?.length || 0,
      permission_keys: keysByUser.get(u.id) ?? [],
    })),
    total,
  };
}

export async function listUserAutoAssignWebsites(userId: string): Promise<string[]> {
  await ensureLeadWebhookSchema();
  const { rows } = await query<{ website_domain: string }>(
    `SELECT website_domain
     FROM user_auto_assign_websites
     WHERE user_id = $1
     ORDER BY website_domain ASC`,
    [userId]
  );
  return rows.map((r) => r.website_domain);
}

/**
 * Replace auto-assign website mappings for a user.
 * Each domain must exist in the active websites master.
 */
export async function setUserAutoAssignWebsites(
  userId: string,
  domains: string[]
): Promise<PublicUser | null> {
  await ensureLeadWebhookSchema();
  const existing = await findUserById(userId);
  if (!existing) return null;

  const resolved: string[] = [];
  for (const raw of domains) {
    const domain = await resolveWebsiteDomain(raw);
    if (!domain) {
      throw new Error(`Unknown or inactive website: ${String(raw)}`);
    }
    if (!resolved.includes(domain)) resolved.push(domain);
  }
  resolved.sort();

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM user_auto_assign_websites WHERE user_id = $1`, [userId]);
    for (const domain of resolved) {
      await client.query(
        `INSERT INTO user_auto_assign_websites (user_id, website_domain) VALUES ($1, $2)`,
        [userId, domain]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const updated = await findUserById(userId);
  return updated ? mapPublicUser(updated) : null;
}

const ALLOWED_ROLES = new Set(["Super Admin", "Admin", "Employee"]);
const ALLOWED_STATUSES = new Set(["Active", "Inactive"]);

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: string;
  status?: string;
  phone?: string;
  department?: string;
};

export type UpdateUserProfileInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  status?: string;
  phone?: string;
  department?: string;
};

/** Create a CRM login user (invite member). */
export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  await ensureLeadWebhookSchema();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const role = input.role.trim();
  const status = (input.status ?? "Active").trim() || "Active";
  const phone = (input.phone ?? "").trim();
  const department = (input.department ?? "").trim();

  if (!name) throw new Error("Name is required");
  if (!email || !email.includes("@")) throw new Error("Valid email is required");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");
  if (!ALLOWED_ROLES.has(role)) throw new Error("Invalid role");
  if (!ALLOWED_STATUSES.has(status)) throw new Error("Invalid status");

  const existing = await findUserByEmail(email);
  if (existing) throw new Error("A user with this email already exists");

  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash(password, 12);

  const { rows } = await query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role, status, phone, department)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, email, password_hash, role, status`,
    [name, email, passwordHash, role, status, phone || null, department || null]
  );
  const created = rows[0];
  if (!created) throw new Error("Failed to create user");
  return mapPublicUser({ ...created, auto_assign_websites: [] });
}

/** Update profile fields for an existing user. */
export async function updateUserProfile(
  id: string,
  input: UpdateUserProfileInput
): Promise<PublicUser | null> {
  await ensureLeadWebhookSchema();
  const existing = await findUserById(id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const email =
    input.email !== undefined ? input.email.trim().toLowerCase() : existing.email;
  const role = input.role !== undefined ? input.role.trim() : existing.role;
  const status = input.status !== undefined ? input.status.trim() : existing.status;
  const phone = input.phone !== undefined ? input.phone.trim() : undefined;
  const department = input.department !== undefined ? input.department.trim() : undefined;

  if (!name) throw new Error("Name is required");
  if (!email || !email.includes("@")) throw new Error("Valid email is required");
  if (!ALLOWED_ROLES.has(role)) throw new Error("Invalid role");
  if (!ALLOWED_STATUSES.has(status)) throw new Error("Invalid status");

  if (email !== existing.email.toLowerCase()) {
    const clash = await findUserByEmail(email);
    if (clash && clash.id !== id) throw new Error("A user with this email already exists");
  }

  const sets: string[] = [
    `name = $2`,
    `email = $3`,
    `role = $4`,
    `status = $5`,
  ];
  const params: unknown[] = [id, name, email, role, status];

  if (phone !== undefined) {
    params.push(phone || null);
    sets.push(`phone = $${params.length}`);
  }
  if (department !== undefined) {
    params.push(department || null);
    sets.push(`department = $${params.length}`);
  }
  if (input.password && input.password.trim().length > 0) {
    if (input.password.trim().length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    const bcrypt = (await import("bcryptjs")).default;
    const passwordHash = await bcrypt.hash(input.password.trim(), 12);
    params.push(passwordHash);
    sets.push(`password_hash = $${params.length}`);
  }

  await query(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $1`,
    params
  );

  const updated = await findUserById(id);
  return updated ? mapPublicUser(updated) : null;
}
