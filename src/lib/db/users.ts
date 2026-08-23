import { query } from "@/lib/db";
import { ensureLeadWebhookSchema } from "@/lib/db/ensure-lead-webhook-schema";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  auto_assign_website: string | null;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  auto_assign_website: string | null;
};

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  await ensureLeadWebhookSchema();
  const { rows } = await query<UserRow>(
    `SELECT id, name, email, password_hash, role, status, auto_assign_website
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  await ensureLeadWebhookSchema();
  const { rows } = await query<UserRow>(
    `SELECT id, name, email, password_hash, role, status, auto_assign_website
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listActiveUsers(): Promise<PublicUser[]> {
  await ensureLeadWebhookSchema();
  const { rows } = await query<PublicUser>(
    `SELECT id, name, email, role, status, auto_assign_website
     FROM users
     WHERE status = 'Active'
     ORDER BY name ASC`
  );
  return rows;
}

/** All users (any status) — for settings sync of auto-assign website. */
export async function listUsers(): Promise<PublicUser[]> {
  await ensureLeadWebhookSchema();
  const { rows } = await query<PublicUser>(
    `SELECT id, name, email, role, status, auto_assign_website
     FROM users
     ORDER BY name ASC`
  );
  return rows;
}

export async function findActiveUserByAutoAssignWebsite(
  domain: string
): Promise<PublicUser | null> {
  await ensureLeadWebhookSchema();
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return null;
  const { rows } = await query<PublicUser>(
    `SELECT id, name, email, role, status, auto_assign_website
     FROM users
     WHERE auto_assign_website = $1
       AND status = 'Active'
     LIMIT 1`,
    [normalized]
  );
  return rows[0] ?? null;
}

/**
 * Set or clear auto-assign website for a user.
 * One user per website: clears the domain from any other user first.
 */
export async function setUserAutoAssignWebsite(
  userId: string,
  domain: string | null
): Promise<PublicUser | null> {
  await ensureLeadWebhookSchema();
  const existing = await findUserById(userId);
  if (!existing) return null;

  if (domain) {
    await query(
      `UPDATE users
       SET auto_assign_website = NULL, updated_at = now()
       WHERE auto_assign_website = $1 AND id <> $2`,
      [domain, userId]
    );
  }

  await query(
    `UPDATE users
     SET auto_assign_website = $2, updated_at = now()
     WHERE id = $1`,
    [userId, domain]
  );

  const updated = await findUserById(userId);
  return updated
    ? {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        auto_assign_website: updated.auto_assign_website,
      }
    : null;
}
