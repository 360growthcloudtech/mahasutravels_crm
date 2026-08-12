import { NextResponse } from "next/server";
import { ingestCorsHeaders, requireIngestAuth, requireSession } from "@/lib/api-auth";
import {
  ingestLead,
  leadToDto,
  listLeads,
  userExists,
  type IngestLeadInput,
} from "@/lib/db/leads";
import {
  getDefaultStatusCode,
  resolveSourceCode,
  resolveStatusCode,
  resolveWebsiteDomain,
} from "@/lib/db/masters";
import {
  CALCULATOR_CARS,
  normalizePhone,
  parseLeadDate,
  parseLeadTime,
} from "@/lib/lead-utils";

export const runtime = "nodejs";

function csvParam(value: string | null): string[] | undefined {
  if (!value?.trim()) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

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

function parseIngestBody(body: Record<string, unknown>): { ok: true; input: IngestLeadInput } | { ok: false; error: string } {
  const name = readString(body.name)?.trim() ?? "";
  const phone = readString(body.phone)?.trim() ?? "";
  const source = readString(body.source)?.trim() ?? "";

  if (!name) return { ok: false, error: "name is required" };
  if (!phone) return { ok: false, error: "phone is required" };
  if (!source) return { ok: false, error: "source is required" };

  const phoneNormalized = normalizePhone(phone);
  if (phoneNormalized.length < 10) {
    return { ok: false, error: "phone must have at least 10 digits" };
  }

  if (source === "taxi_calculator") {
    const car = readString(body.car)?.trim().toLowerCase() ?? "";
    if (car && !(CALCULATOR_CARS as readonly string[]).includes(car)) {
      return { ok: false, error: "car must be sedan, suv, or innova" };
    }
  }

  const pickupDate = parseLeadDate(body.pickup_date);
  const dropDate = parseLeadDate(body.drop_date);
  if (body.pickup_date && !pickupDate) return { ok: false, error: "pickup_date is invalid" };
  if (body.drop_date && !dropDate) return { ok: false, error: "drop_date is invalid" };

  const followUpDate =
    body.next_follow_up_date === null || body.next_follow_up_date === ""
      ? null
      : parseLeadDate(body.next_follow_up_date);
  const followUpTime =
    body.next_follow_up_time === null || body.next_follow_up_time === ""
      ? null
      : parseLeadTime(body.next_follow_up_time);
  if (body.next_follow_up_date && body.next_follow_up_date !== null && !followUpDate) {
    return { ok: false, error: "next_follow_up_date is invalid" };
  }
  if (body.next_follow_up_time && body.next_follow_up_time !== null && !followUpTime) {
    return { ok: false, error: "next_follow_up_time is invalid" };
  }

  const assignedTo = readString(body.assigned_to)?.trim() || undefined;

  return {
    ok: true,
    input: {
      name,
      phone,
      email: readString(body.email)?.trim() ?? "",
      pickup: readString(body.pickup)?.trim() ?? "",
      drop: readString(body.drop)?.trim() ?? "",
      car: readString(body.car)?.trim() ?? "",
      days: readNumber(body.days) ?? 0,
      pickup_date: pickupDate,
      drop_date: dropDate,
      next_follow_up_date: followUpDate,
      next_follow_up_time: followUpTime,
      price: readNumber(body.price) ?? 0,
      source,
      city: readString(body.city)?.trim() ?? "",
      website: readString(body.website)?.trim() || null,
      tour_package: readString(body.tour_package)?.trim() ?? "",
      adults: readNumber(body.adults) ?? 0,
      kids: readNumber(body.kids) ?? 0,
      notes: readString(body.notes)?.trim() ?? "",
      status: typeof body.status === "string" ? body.status : undefined,
      assigned_to: assignedTo ?? null,
    },
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: ingestCorsHeaders(request) });
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const leads = await listLeads({
    search: url.searchParams.get("search") ?? undefined,
    status: csvParam(url.searchParams.get("status")),
    source: csvParam(url.searchParams.get("source")),
    assigned_to: csvParam(url.searchParams.get("assigned_to")),
    website: csvParam(url.searchParams.get("website")),
  });

  return NextResponse.json({ leads: leads.map(leadToDto) });
}

export async function POST(request: Request) {
  const cors = ingestCorsHeaders(request);
  const auth = await requireIngestAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: cors });
  }

  const parsed = parseIngestBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: cors });
  }

  const sourceCode = await resolveSourceCode(parsed.input.source);
  if (!sourceCode) {
    return NextResponse.json({ error: "Unknown or inactive source" }, { status: 400, headers: cors });
  }
  parsed.input.source = sourceCode;

  if (parsed.input.status) {
    const statusCode = await resolveStatusCode(parsed.input.status);
    if (!statusCode) {
      return NextResponse.json({ error: "Unknown or inactive status" }, { status: 400, headers: cors });
    }
    parsed.input.status = statusCode;
  } else {
    parsed.input.status = await getDefaultStatusCode();
  }

  if (parsed.input.website) {
    const website = await resolveWebsiteDomain(parsed.input.website);
    if (!website) {
      return NextResponse.json({ error: "Unknown or inactive website" }, { status: 400, headers: cors });
    }
    parsed.input.website = website;
  }

  if (parsed.input.assigned_to && !(await userExists(parsed.input.assigned_to))) {
    return NextResponse.json({ error: "assigned_to user not found" }, { status: 400, headers: cors });
  }

  const actor = auth.kind === "session" ? auth.session.name : parsed.input.source;
  const result = await ingestLead(parsed.input, actor);
  const dto = leadToDto(result.lead);

  return NextResponse.json(
    {
      ok: true,
      lead_id: dto.id,
      lead_no: dto.lead_no,
      repeat_inquiry: result.repeat_inquiry,
      inquiry_count: dto.inquiry_count,
      status: dto.status,
      lead: dto,
    },
    { headers: cors }
  );
}
