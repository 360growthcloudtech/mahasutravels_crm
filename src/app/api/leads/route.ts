import { NextResponse } from "next/server";
import { ingestCorsHeaders, requireIngestAuth, requireSession } from "@/lib/api-auth";
import {
  ingestLead,
  leadToDto,
  listLeads,
  userExists,
} from "@/lib/db/leads";
import { resolveItineraryPackage } from "@/lib/db/itineraries";
import { resolveVehicleOption } from "@/lib/db/drivers";
import {
  getDefaultStatusCode,
  resolveSourceCode,
  resolveStatusCode,
  resolveWebsiteDomain,
} from "@/lib/db/masters";
import { parseLeadIngestBody } from "@/lib/lead-ingest-parse";

export const runtime = "nodejs";

function csvParam(value: string | null): string[] | undefined {
  if (!value?.trim()) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
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

  const parsed = parseLeadIngestBody(body, {
    mode: auth.kind === "session" ? "crm" : "webhook",
  });
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

  if (parsed.input.itinerary_template_id) {
    const pkg = await resolveItineraryPackage(parsed.input.itinerary_template_id, { requireActive: true });
    if (!pkg) {
      return NextResponse.json(
        { error: "Unknown or inactive itinerary_template_id" },
        { status: 400, headers: cors }
      );
    }
    parsed.input.itinerary_template_id = pkg.id;
    parsed.input.tour_package = pkg.name;
  }

  if (parsed.input.vehicle_id) {
    const vehicle = await resolveVehicleOption(parsed.input.vehicle_id, { requireApproved: true });
    if (!vehicle) {
      return NextResponse.json(
        { error: "Unknown or unavailable vehicle_id" },
        { status: 400, headers: cors }
      );
    }
    parsed.input.vehicle_id = vehicle.id;
    parsed.input.car = vehicle.vehicle_type;
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
