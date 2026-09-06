import { formatRelativeTime } from "@/lib/lead-utils";

export type NotificationKind = "lead" | "booking" | "comment" | "trip";

export type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  href: string;
  unread: boolean;
  kind: NotificationKind;
  createdAt: string;
};

type NotificationsResponse = {
  items: Array<{
    id: string;
    kind: NotificationKind;
    title: string;
    detail: string;
    href: string;
    lead_id: string | null;
    created_at: string;
    read_at: string | null;
    unread: boolean;
  }>;
  unread_count: number;
};

function mapItem(
  row: NotificationsResponse["items"][number]
): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    time: formatRelativeTime(row.created_at) || row.created_at,
    href: row.href || "/leads",
    unread: row.unread,
    kind: row.kind,
    createdAt: row.created_at,
  };
}

export async function fetchNotifications(): Promise<{
  items: NotificationItem[];
  unreadCount: number;
}> {
  const res = await fetch("/api/notifications", { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load notifications");
  }
  const data = (await res.json()) as NotificationsResponse;
  return {
    items: (data.items || []).map(mapItem),
    unreadCount: Number(data.unread_count) || 0,
  };
}

export async function markNotificationReadApi(id: string): Promise<number> {
  const res = await fetch("/api/notifications/mark-read", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    throw new Error("Failed to mark notification read");
  }
  const data = (await res.json()) as { unread_count?: number };
  return Number(data.unread_count) || 0;
}

export async function markAllNotificationsReadApi(): Promise<number> {
  const res = await fetch("/api/notifications/mark-read", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ all: true }),
  });
  if (!res.ok) {
    throw new Error("Failed to mark all notifications read");
  }
  const data = (await res.json()) as { unread_count?: number };
  return Number(data.unread_count) || 0;
}
