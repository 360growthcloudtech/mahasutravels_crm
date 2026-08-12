import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  deleteLead,
  findLeadById,
  isUniqueViolation,
  leadToDto,
  patchLead,
  userExists,
  type PatchLeadInput,
} from "@/lib/db/leads";
import { resolveSourceCode, resolveStatusCode, resolveWebsiteDomain } from "@/lib/db/masters";
import { normalizePhone, parseLeadDate, parseLeadTime } from "@/lib/lead-utils";

export const runtime = "nodejs";

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function readNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const lead = await findLeadById(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ lead: leadToDto(lead) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: PatchLeadInput = {};
  if (body.name !== undefined) patch.name = readString(body.name) ?? "";
  if (body.phone !== undefined) {
    const phone = readString(body.phone)?.trim() ?? "";
    if (normalizePhone(phone).length < 10) {
      return NextResponse.json({ error: "phone must have at least 10 digits" }, { status: 400 });
    }
    patch.phone = phone;
  }
  if (body.email !== undefined) patch.email = readString(body.email) ?? "";
  if (body.pickup !== undefined) patch.pickup = readString(body.pickup) ?? "";
  if (body.drop !== undefined) patch.drop = readString(body.drop) ?? "";
  if (body.car !== undefined) patch.car = readString(body.car) ?? "";
  if (body.days !== undefined) patch.days = readNumber(body.days) ?? 0;
  if (body.pickup_date !== undefined) {
    if (body.pickup_date === null || body.pickup_date === "") {
      patch.pickup_date = null;
    } else {
      const parsed = parseLeadDate(body.pickup_date);
      if (!parsed) return NextResponse.json({ error: "pickup_date is invalid" }, { status: 400 });
      patch.pickup_date = parsed;
    }
  }
  if (body.drop_date !== undefined) {
    if (body.drop_date === null || body.drop_date === "") {
      patch.drop_date = null;
    } else {
      const parsed = parseLeadDate(body.drop_date);
      if (!parsed) return NextResponse.json({ error: "drop_date is invalid" }, { status: 400 });
      patch.drop_date = parsed;
    }
  }
  if (body.next_follow_up_date !== undefined) {
    if (body.next_follow_up_date === null || body.next_follow_up_date === "") {
      patch.next_follow_up_date = null;
    } else {
      const parsed = parseLeadDate(body.next_follow_up_date);
      if (!parsed) return NextResponse.json({ error: "next_follow_up_date is invalid" }, { status: 400 });
      patch.next_follow_up_date = parsed;
    }
  }
  if (body.next_follow_up_time !== undefined) {
    if (body.next_follow_up_time === null || body.next_follow_up_time === "") {
      patch.next_follow_up_time = null;
    } else {
      const parsed = parseLeadTime(body.next_follow_up_time);
      if (!parsed) return NextResponse.json({ error: "next_follow_up_time is invalid" }, { status: 400 });
      patch.next_follow_up_time = parsed;
    }
  }
  if (body.price !== undefined) patch.price = readNumber(body.price) ?? 0;
  if (body.source !== undefined) {
    const source = await resolveSourceCode(readString(body.source)?.trim() ?? "");
    if (!source) return NextResponse.json({ error: "Unknown or inactive source" }, { status: 400 });
    patch.source = source;
  }
  if (body.city !== undefined) patch.city = readString(body.city) ?? "";
  if (body.website !== undefined) {
    const raw = readNullableString(body.website);
    if (!raw) {
      patch.website = null;
    } else {
      const website = await resolveWebsiteDomain(raw);
      if (!website) return NextResponse.json({ error: "Unknown or inactive website" }, { status: 400 });
      patch.website = website;
    }
  }
  if (body.tour_package !== undefined) patch.tour_package = readString(body.tour_package) ?? "";
  if (body.adults !== undefined) patch.adults = readNumber(body.adults) ?? 0;
  if (body.kids !== undefined) patch.kids = readNumber(body.kids) ?? 0;
  if (body.notes !== undefined) patch.notes = readString(body.notes) ?? "";
  if (body.status !== undefined) {
    const status = await resolveStatusCode(body.status);
    if (!status) return NextResponse.json({ error: "Unknown or inactive status" }, { status: 400 });
    patch.status = status;
  }
  if (body.assigned_to !== undefined) {
    const assigned = readNullableString(body.assigned_to);
    if (assigned) {
      if (!(await userExists(assigned))) {
        return NextResponse.json({ error: "assigned_to user not found" }, { status: 400 });
      }
      patch.assigned_to = assigned;
    } else {
      patch.assigned_to = null;
    }
  }

  try {
    const lead = await patchLead(id, patch, session.name);
    return NextResponse.json({ lead: leadToDto(lead) });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "An open lead with this phone already exists." },
        { status: 409 }
      );
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const deleted = await deleteLead(id);
  if (!deleted) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
