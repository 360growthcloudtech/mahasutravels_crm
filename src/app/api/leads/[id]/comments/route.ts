import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  addLeadComment,
  commentToDto,
  findLeadById,
  listLeadComments,
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

  const comments = await listLeadComments(id);
  return NextResponse.json({ comments: comments.map(commentToDto) });
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

  let body: { text?: unknown };
  try {
    body = (await request.json()) as { text?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const comment = await addLeadComment(id, text, session.sub, session.name);
  return NextResponse.json({ comment: commentToDto(comment) }, { status: 201 });
}
