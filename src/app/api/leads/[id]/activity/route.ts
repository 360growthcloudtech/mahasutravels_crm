import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { activityToDto, findLeadById, listLeadActivity } from "@/lib/db/leads";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const lead = await findLeadById(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const activity = await listLeadActivity(id);
  return NextResponse.json({ activity: activity.map(activityToDto) });
}
