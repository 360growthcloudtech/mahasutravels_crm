import { NextResponse } from "next/server";
import { forbidUnlessAnyPermission, requireSession } from "@/lib/api-auth";
import { findLeadById, patchLead, recordLeadActivity } from "@/lib/db/leads";
import { sendLeadQuote } from "@/lib/db/lead-quotes";
import { normalizeQuoteDays, normalizeQuoteHotels, type LeadQuoteInput } from "@/lib/quote-defaults";

export const runtime = "nodejs";

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function parseQuoteBody(body: Record<string, unknown>): LeadQuoteInput {
  return {
    greeting: readString(body.greeting),
    intro_text: readString(body.intro_text),
    company_contact_name: readString(body.company_contact_name),
    company_contact_phone: readString(body.company_contact_phone),
    destination: readString(body.destination),
    duration_label: readString(body.duration_label),
    vehicle_label: readString(body.vehicle_label),
    amount: readNumber(body.amount),
    amount_note: readString(body.amount_note),
    inclusions: readStringArray(body.inclusions),
    exclusions: readStringArray(body.exclusions),
    terms: readString(body.terms),
    guest_name: readString(body.guest_name),
    guest_phone: readString(body.guest_phone),
    guest_email: readString(body.guest_email),
    adults: Math.max(0, Math.floor(readNumber(body.adults))),
    kids: Math.max(0, Math.floor(readNumber(body.kids))),
    kids_note: readString(body.kids_note),
    travel_date:
      body.travel_date === null || body.travel_date === ""
        ? null
        : readString(body.travel_date).slice(0, 10) || null,
    return_date:
      body.return_date === null || body.return_date === ""
        ? null
        : readString(body.return_date).slice(0, 10) || null,
    pickup: readString(body.pickup),
    dropoff: readString(body.dropoff),
    tour_title: readString(body.tour_title),
    tour_subtitle: readString(body.tour_subtitle),
    days: normalizeQuoteDays(body.days ?? body.days_json),
    hotels: normalizeQuoteHotels(body.hotels ?? body.hotels_json),
    note: readString(body.note),
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessAnyPermission(session, ["leads.quote", "leads.edit"]);
  if (denied) return denied;

  const { id } = await context.params;
  const lead = await findLeadById(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (session.role === "Employee" && lead.assigned_to !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = parseQuoteBody(body);
  if (!input.guest_name.trim()) {
    return NextResponse.json({ error: "guest_name is required" }, { status: 400 });
  }
  if (input.amount <= 0) {
    return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 });
  }

  const quote = await sendLeadQuote(id, input);
  await patchLead(
    id,
    {
      status: "Hot",
      price: quote.amount,
      notes: quote.note || lead.notes,
    },
    session.name || session.email
  );
  await recordLeadActivity(
    id,
    "quoted",
    "Quote sent",
    session.name || session.email,
    `₹${quote.amount.toLocaleString("en-IN")} · ${quote.tour_title || "package"} via WhatsApp`
  );

  return NextResponse.json({ quote });
}
