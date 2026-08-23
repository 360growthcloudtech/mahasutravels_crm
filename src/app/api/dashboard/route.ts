import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getDashboard, parseDashboardFilters } from "@/lib/db/dashboard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = parseDashboardFilters(url.searchParams);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const dashboard = await getDashboard(parsed.filters);
  return NextResponse.json({ dashboard });
}
