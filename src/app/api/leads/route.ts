import { NextResponse } from "next/server";
import { ingestCorsHeaders, forbidUnlessPermission, requireIngestAuth, requireSession } from "@/lib/api-auth";
import {
  ingestLead,
  leadToDto,
  listLeads,
  listLeadsPage,
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
import { websiteHostFromUrl } from "@/lib/utm";
import { parseLeadsListFilters, parseLeadsPagination } from "@/lib/api/list-filters";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: ingestCorsHeaders(request) });
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = forbidUnlessPermission(session, "leads.view");
  if (denied) return denied;

  const url = new URL(request.url);
  const filters = parseLeadsListFilters(url.searchParams, session);
  const { page, pageSize, paginated } = parseLeadsPagination(url.searchParams);

  if (!paginated) {
    const leads = await listLeads(filters);
    return NextResponse.json({ leads: leads.map(leadToDto) });
  }

  const offset = (page - 1) * pageSize;
  const result = await listLeadsPage(filters, { limit: pageSize, offset });
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize) || 1);

  return NextResponse.json({
    leads: result.rows.map(leadToDto),
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages,
      hasMore: page * pageSize < result.total,
    },
    stats: result.stats,
  });
}

export async function POST(request: Request) {
  const cors = ingestCorsHeaders(request);
  const auth = await requireIngestAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }
  if (auth.kind === "session") {
    const denied = forbidUnlessPermission(auth.session, "leads.create");
    if (denied) {
      const body = await denied.json();
      return NextResponse.json(body, { status: 403, headers: cors });
    }
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

  const fromPage = await resolveWebsiteDomain(websiteHostFromUrl(parsed.input.page_url));
  if (fromPage) {
    parsed.input.website = fromPage;
  } else if (parsed.input.website) {
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
