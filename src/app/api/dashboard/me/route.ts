import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import { getEmployeeDashboard, parseEmployeeDashboardFilters } from "@/lib/db/dashboard-me";
import { findUserById } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = forbidUnlessPermission(session, "dashboard.view");
  if (denied) return denied;

  const url = new URL(request.url);
  const parsed = parseEmployeeDashboardFilters(url.searchParams);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let userId = session.sub;
  let userName = session.name;
  const requestedId = parsed.filters.userId;
  if (requestedId && requestedId !== session.sub) {
    if (session.role === "Employee") {
      return NextResponse.json(
        { error: "You can only view your own dashboard" },
        { status: 403 }
      );
    }
    const user = await findUserById(requestedId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    userId = user.id;
    userName = user.name;
  }

  const dashboard = await getEmployeeDashboard(userId, userName, parsed.filters);
  return NextResponse.json({ dashboard });
}
