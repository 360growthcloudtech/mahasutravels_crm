import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import { getEmployeeDashboard, parseEmployeeDashboardFilters } from "@/lib/db/dashboard-me";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = forbidUnlessPermission(session, "dashboard.view");
  if (denied) return denied;
  if (session.role !== "Employee") {
    return NextResponse.json(
      { error: "Employee dashboard is only available for Employee role" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const parsed = parseEmployeeDashboardFilters(url.searchParams);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const dashboard = await getEmployeeDashboard(session.sub, session.name, parsed.filters);
  return NextResponse.json({ dashboard });
}
