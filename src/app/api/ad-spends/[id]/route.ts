import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import {
  adSpendToDto,
  deleteAdSpend,
  findAdSpendById,
  isAdPlatform,
  patchAdSpend,
  type PatchAdSpendInput,
} from "@/lib/db/ad-spends";
import { parseLeadTime } from "@/lib/lead-utils";

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

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "ad.spend.and.marketing.view");
  if (denied) return denied;

  const { id } = await context.params;
  const spend = await findAdSpendById(id);
  if (!spend) return NextResponse.json({ error: "Ad spend not found" }, { status: 404 });
  return NextResponse.json({ adSpend: adSpendToDto(spend) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "ad.spend.and.marketing.edit");
  if (denied) return denied;

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: PatchAdSpendInput = {};

  if (body.platform !== undefined) {
    const platform = readString(body.platform)?.trim();
    if (!platform || !isAdPlatform(platform)) {
      return NextResponse.json({ error: "platform is invalid" }, { status: 400 });
    }
    patch.platform = platform;
  }

  if (body.website !== undefined) {
    patch.website = readString(body.website)?.trim() ?? "";
  }

  if (body.amount !== undefined) {
    const amount = readNumber(body.amount);
    if (amount === undefined || amount < 0) {
      return NextResponse.json(
        { error: "amount must be a non-negative number" },
        { status: 400 }
      );
    }
    patch.amount = amount;
  }

  if (body.spend_date !== undefined || body.date !== undefined) {
    const spendDate =
      readString(body.spend_date)?.trim() || readString(body.date)?.trim() || "";
    if (!spendDate || !isDateOnly(spendDate)) {
      return NextResponse.json(
        { error: "spend_date must be a YYYY-MM-DD date" },
        { status: 400 }
      );
    }
    patch.spend_date = spendDate;
  }

  if (body.spend_time !== undefined || body.time !== undefined) {
    const spendTimeRaw =
      readString(body.spend_time)?.trim() || readString(body.time)?.trim() || "";
    const spendTime = parseLeadTime(spendTimeRaw);
    if (!spendTime) {
      return NextResponse.json(
        { error: "spend_time must be a valid time (HH:MM)" },
        { status: 400 }
      );
    }
    patch.spend_time = spendTime;
  }

  if (body.campaign_name !== undefined) {
    patch.campaign_name = readString(body.campaign_name)?.trim() ?? "";
  }

  if (body.leads_generated !== undefined) {
    const leadsGenerated = readNumber(body.leads_generated);
    if (leadsGenerated === undefined || leadsGenerated < 0) {
      return NextResponse.json(
        { error: "leads_generated must be a non-negative number" },
        { status: 400 }
      );
    }
    patch.leads_generated = leadsGenerated;
  }

  if (body.notes !== undefined) {
    patch.notes = readString(body.notes)?.trim() ?? "";
  }

  try {
    const spend = await patchAdSpend(id, patch);
    return NextResponse.json({ adSpend: adSpendToDto(spend) });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Ad spend not found" }, { status: 404 });
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
  const denied = forbidUnlessPermission(session, "ad.spend.and.marketing.delete");
  if (denied) return denied;

  const { id } = await context.params;
  const deleted = await deleteAdSpend(id);
  if (!deleted) return NextResponse.json({ error: "Ad spend not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
