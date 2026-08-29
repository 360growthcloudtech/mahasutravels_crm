import type { PoolClient } from "pg";
import { getPool } from "@/lib/db";
import { ensureLeadWebhookSchema } from "@/lib/db/ensure-lead-webhook-schema";
import type { PublicUser } from "@/lib/db/users";

type PickedUser = Pick<PublicUser, "id" | "name" | "email" | "role" | "status">;

function istDayLockKey(domain: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `auto-assign:${domain}:${y}-${m}-${d}`;
}

const PICK_USER_SQL = `
  WITH ist_day AS (
    SELECT
      (date_trunc('day', $2::timestamptz AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS day_start,
      ((date_trunc('day', $2::timestamptz AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata') AS day_end
  ),
  counts AS (
    SELECT l.assigned_to AS user_id, COUNT(*)::int AS cnt
    FROM leads l
    CROSS JOIN ist_day d
    WHERE l.website = $1
      AND l.assigned_to IS NOT NULL
      AND l.created_at >= d.day_start
      AND l.created_at < d.day_end
    GROUP BY l.assigned_to
  ),
  eligible AS (
    SELECT u.id, u.name, u.email, u.role, u.status, COALESCE(c.cnt, 0) AS lead_count
    FROM users u
    INNER JOIN user_auto_assign_websites uaw
      ON uaw.user_id = u.id AND uaw.website_domain = $1
    LEFT JOIN counts c ON c.user_id = u.id
    WHERE u.status = 'Active'
  )
  SELECT id, name, email, role, status
  FROM eligible
  ORDER BY lead_count ASC, id ASC
  LIMIT 1
`;

async function pickWithClient(
  client: PoolClient,
  domain: string,
  now: Date,
  useLock: boolean
): Promise<PickedUser | null> {
  if (useLock) {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [istDayLockKey(domain, now)]);
  }
  const { rows } = await client.query<PickedUser>(PICK_USER_SQL, [domain, now]);
  return rows[0] ?? null;
}

/**
 * Pick the Active user mapped to this website with the fewest leads
 * assigned today (IST calendar day). Tie-break by user id.
 */
export async function pickAutoAssignUserForWebsite(
  domain: string,
  now = new Date()
): Promise<PickedUser | null> {
  await ensureLeadWebhookSchema();
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return null;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const picked = await pickWithClient(client, normalized, now, true);
    await client.query("COMMIT");
    return picked;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Pick within an existing transaction (e.g. before lead insert). */
export async function pickAutoAssignUserForWebsiteWithClient(
  client: PoolClient,
  domain: string,
  now = new Date()
): Promise<PickedUser | null> {
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return null;
  return pickWithClient(client, normalized, now, true);
}
