import { query } from "@/lib/db";
import { toIso } from "@/lib/lead-utils";

export type NotificationKind = "lead" | "booking" | "comment" | "trip";

export type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
  lead_id: string | null;
  created_at: unknown;
  read_at: unknown;
};

export type NotificationDto = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
  lead_id: string | null;
  created_at: string;
  read_at: string | null;
  unread: boolean;
};

type LeadNotifyFields = {
  id: string;
  name: string;
  source: string;
  tour_package: string;
  notes: string;
  website: string | null;
};

function isNotificationKind(value: string): value is NotificationKind {
  return value === "lead" || value === "booking" || value === "comment" || value === "trip";
}

export function notificationToDto(row: NotificationRow): NotificationDto {
  const kind = isNotificationKind(row.kind) ? row.kind : "lead";
  const readAt = row.read_at ? toIso(row.read_at) : null;
  return {
    id: row.id,
    kind,
    title: row.title ?? "",
    detail: row.detail ?? "",
    href: row.href || "/leads",
    lead_id: row.lead_id,
    created_at: toIso(row.created_at),
    read_at: readAt,
    unread: !readAt,
  };
}

function leadNotificationCopy(lead: LeadNotifyFields, unassigned: boolean) {
  const title = unassigned
    ? `Unassigned lead · ${lead.name.trim() || "Guest"}`
    : `New lead · ${lead.name.trim() || "Guest"}`;
  const packageOrNotes =
    lead.tour_package?.trim() ||
    lead.notes?.trim().slice(0, 80) ||
    "New enquiry";
  const source = lead.source?.trim() || "Manual";
  const detail = lead.website?.trim()
    ? `${source} · ${packageOrNotes} · ${lead.website.trim()}`
    : `${source} · ${packageOrNotes}`;
  return {
    title,
    detail,
    href: `/leads?focus=${encodeURIComponent(lead.id)}`,
  };
}

export async function listAdminRecipientIds(): Promise<string[]> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE status = 'Active'
       AND role IN ('Super Admin', 'Admin')
     ORDER BY id ASC`
  );
  return rows.map((r) => r.id);
}

export async function createNotificationsForUsers(
  userIds: string[],
  payload: {
    kind?: NotificationKind;
    title: string;
    detail: string;
    href: string;
    lead_id?: string | null;
  }
): Promise<number> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (!unique.length) return 0;

  const { rowCount } = await query(
    `INSERT INTO notifications (user_id, kind, title, detail, href, lead_id)
     SELECT u.id, $2, $3, $4, $5, $6
     FROM unnest($1::uuid[]) AS u(id)`,
    [
      unique,
      payload.kind || "lead",
      payload.title,
      payload.detail,
      payload.href,
      payload.lead_id ?? null,
    ]
  );
  return rowCount ?? 0;
}

/** Notify the assignee about a newly assigned lead. */
export async function notifyLeadAssigned(
  lead: LeadNotifyFields,
  assigneeUserId: string
): Promise<void> {
  const copy = leadNotificationCopy(lead, false);
  await createNotificationsForUsers([assigneeUserId], {
    kind: "lead",
    ...copy,
    lead_id: lead.id,
  });
}

/** Notify Active Super Admins + Admins about an unassigned lead. */
export async function notifyLeadUnassigned(lead: LeadNotifyFields): Promise<void> {
  const recipients = await listAdminRecipientIds();
  if (!recipients.length) return;
  const copy = leadNotificationCopy(lead, true);
  await createNotificationsForUsers(recipients, {
    kind: "lead",
    ...copy,
    lead_id: lead.id,
  });
}

/** Emit the correct audience notification after create or assign change. */
export async function notifyLeadAssignmentAudience(
  lead: LeadNotifyFields & { assigned_to: string | null }
): Promise<void> {
  if (lead.assigned_to) {
    await notifyLeadAssigned(lead, lead.assigned_to);
  } else {
    await notifyLeadUnassigned(lead);
  }
}

export async function listNotificationsForUser(
  userId: string,
  opts?: { limit?: number }
): Promise<NotificationRow[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 40, 1), 100);
  const { rows } = await query<NotificationRow>(
    `SELECT id, user_id, kind, title, detail, href, lead_id, created_at, read_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM notifications
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return Number(rows[0]?.count) || 0;
}

export async function markNotificationRead(
  userId: string,
  id: string
): Promise<boolean> {
  const result = await query(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await query(
    `UPDATE notifications
     SET read_at = now()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return result.rowCount ?? 0;
}
