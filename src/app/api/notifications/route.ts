import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  countUnreadNotifications,
  listNotificationsForUser,
  notificationToDto,
} from "@/lib/db/notifications";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rows, unreadCount] = await Promise.all([
    listNotificationsForUser(session.sub, { limit: 40 }),
    countUnreadNotifications(session.sub),
  ]);

  return NextResponse.json({
    items: rows.map(notificationToDto),
    unread_count: unreadCount,
  });
}
