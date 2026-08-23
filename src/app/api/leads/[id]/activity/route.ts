import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  activityToDto,
  findLeadById,
  listLeadActivity,
  recordLeadActivity,
} from "@/lib/db/leads";

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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const lead = await findLeadById(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!action || !label) {
    return NextResponse.json({ error: "action and label are required" }, { status: 400 });
  }

  const detail = typeof body.detail === "string" ? body.detail.trim() : undefined;
  const actor =
    (typeof body.actor === "string" && body.actor.trim()) ||
    session.name ||
    session.email ||
    "System";

  await recordLeadActivity(id, action, label, actor, detail || undefined);
  const activity = await listLeadActivity(id);
  return NextResponse.json({ activity: activity.map(activityToDto) }, { status: 201 });
}
