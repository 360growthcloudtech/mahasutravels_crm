import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import { parseAdSpendsListFilters, parseLeadsPagination } from "@/lib/api/list-filters";
import {
  adSpendToDto,
  createAdSpend,
  isAdPlatform,
  listAdSpends,
  listAdSpendsPage,
  type CreateAdSpendInput,
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

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = forbidUnlessPermission(session, "ad.spend.and.marketing.view");
  if (denied) return denied;

  const url = new URL(request.url);
  const filters = parseAdSpendsListFilters(url.searchParams);
  const { page, pageSize, paginated } = parseLeadsPagination(url.searchParams);

  if (!paginated) {
    const spends = await listAdSpends(filters);
    return NextResponse.json({ adSpends: spends.map(adSpendToDto) });
  }

  const offset = (page - 1) * pageSize;
  const result = await listAdSpendsPage(filters, { limit: pageSize, offset });
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize) || 1);

  return NextResponse.json({
    adSpends: result.rows.map(adSpendToDto),
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages,
      hasMore: page * pageSize < result.total,
    },
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = forbidUnlessPermission(session, "ad.spend.and.marketing.create");
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const platformRaw = readString(body.platform)?.trim();
  if (!platformRaw || !isAdPlatform(platformRaw)) {
    return NextResponse.json({ error: "platform is invalid" }, { status: 400 });
  }

  const amount = readNumber(body.amount);
  if (amount === undefined || amount < 0) {
    return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
  }

  const spendDate =
    readString(body.spend_date)?.trim() || readString(body.date)?.trim() || "";
  if (!spendDate || !isDateOnly(spendDate)) {
    return NextResponse.json(
      { error: "spend_date must be a YYYY-MM-DD date" },
      { status: 400 }
    );
  }

  const spendTimeRaw =
    readString(body.spend_time)?.trim() || readString(body.time)?.trim() || "";
  const spendTime = parseLeadTime(spendTimeRaw);
  if (!spendTime) {
    return NextResponse.json(
      { error: "spend_time must be a valid time (HH:MM)" },
      { status: 400 }
    );
  }

  const leadsGenerated = readNumber(body.leads_generated);
  if (leadsGenerated !== undefined && leadsGenerated < 0) {
    return NextResponse.json(
      { error: "leads_generated must be a non-negative number" },
      { status: 400 }
    );
  }

  const input: CreateAdSpendInput = {
    platform: platformRaw,
    website: readString(body.website)?.trim() ?? "",
    amount,
    spend_date: spendDate,
    spend_time: spendTime,
    campaign_name: readString(body.campaign_name)?.trim() ?? "",
    leads_generated: leadsGenerated ?? 0,
    notes: readString(body.notes)?.trim() ?? "",
  };

  const spend = await createAdSpend(input);
  return NextResponse.json({ adSpend: adSpendToDto(spend) }, { status: 201 });
}
