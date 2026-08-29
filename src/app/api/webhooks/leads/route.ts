import { NextResponse } from "next/server";
import { ingestCorsHeaders, isValidIngestApiKey } from "@/lib/api-auth";
import { ensureLeadWebhookSchema } from "@/lib/db/ensure-lead-webhook-schema";
import { ingestLead, leadToDto } from "@/lib/db/leads";
import {
  getDefaultStatusCode,
  resolveSourceCode,
  resolveWebsiteDomain,
} from "@/lib/db/masters";
import { parseLeadIngestBody } from "@/lib/lead-ingest-parse";

export const runtime = "nodejs";

/**
 * Single public lead webhook for all marketing websites + Meta/Google tooling.
 *
 * Auth: header `x-api-key` = LEADS_INGEST_API_KEY
 *
 * form_type catalog (send with website or page_url):
 * - mahasutravels.com
 *   quick_inquiry | request_callback | contact | enquire_now | taxi_calculator
 * - himachaltaxitrip.com
 *   taxi_calculator | contact | cab_booking
 * - himachaltouristcabs.com
 *   taxi_calculator | taxi_booking | contact
 * - himachaltourismcab.com
 *   taxi_calculator | cab_booking | request_callback | contact
 *
 * Unknown form_type values are stored as-is.
 * Identity: phone OR email required; name defaults to "Website lead".
 * See docs/lead-webhook.md for field aliases and curl examples.
 */
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: ingestCorsHeaders(request) });
}

export async function POST(request: Request) {
  const cors = ingestCorsHeaders(request);
  if (!isValidIngestApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: cors });
  }

  const parsed = parseLeadIngestBody(body, { mode: "webhook" });
  if (!parsed.ok) {
    console.warn("[webhooks/leads] 400 parse", {
      error: parsed.error,
      keys: Object.keys(body),
      phone: body.phone ?? body.phone_number ?? body.mobile,
      email: body.email,
      name: body.name ?? body.full_name,
      website: body.website,
      page_url: body.page_url ?? body.landing_url ?? body.url,
      form_type: body.form_type,
      source: body.source,
      pick_up_date: body.pick_up_date ?? body.pickup_date ?? body.travel_date,
    });
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: cors });
  }

  await ensureLeadWebhookSchema();

  const sourceCode = await resolveSourceCode(parsed.input.source);
  if (!sourceCode) {
    console.warn("[webhooks/leads] 400 unknown source", { source: parsed.input.source });
    return NextResponse.json({ error: "Unknown or inactive source" }, { status: 400, headers: cors });
  }
  parsed.input.source = sourceCode;
  parsed.input.status = await getDefaultStatusCode();

  // Soft-resolve website: unknown domain → null, keep page_url for tracking
  if (parsed.input.website) {
    const website = await resolveWebsiteDomain(parsed.input.website);
    parsed.input.website = website;
  }

  const actor = parsed.input.form_type
    ? `webhook:${parsed.input.form_type}`
    : `webhook:${parsed.input.source}`;
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
      source: dto.source,
      website: dto.website,
      form_type: dto.form_type,
      lead: dto,
    },
    { status: 201, headers: cors }
  );
}
