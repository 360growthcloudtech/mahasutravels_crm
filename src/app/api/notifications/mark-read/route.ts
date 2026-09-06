import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  countUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/db/notifications";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; all?: unknown };
  try {
    body = (await request.json()) as { id?: unknown; all?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.all === true) {
    const updated = await markAllNotificationsRead(session.sub);
    const unreadCount = await countUnreadNotifications(session.sub);
    return NextResponse.json({ ok: true, updated, unread_count: unreadCount });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "id or all is required" }, { status: 400 });
  }

  const ok = await markNotificationRead(session.sub, id);
  if (!ok) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  const unreadCount = await countUnreadNotifications(session.sub);
  return NextResponse.json({ ok: true, unread_count: unreadCount });
}
