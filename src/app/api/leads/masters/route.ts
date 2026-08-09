import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { listLeadSources, listLeadStatuses, listWebsites } from "@/lib/db/masters";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [statuses, sources, websites] = await Promise.all([
    listLeadStatuses(true),
    listLeadSources(true),
    listWebsites(true),
  ]);

  return NextResponse.json({ statuses, sources, websites });
}
