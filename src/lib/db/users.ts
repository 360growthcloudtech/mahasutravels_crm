import { query, getPool } from "@/lib/db";
import { ensureLeadWebhookSchema } from "@/lib/db/ensure-lead-webhook-schema";
import { resolveWebsiteDomain } from "@/lib/db/masters";

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
