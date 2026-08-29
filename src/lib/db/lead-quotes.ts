import { query } from "@/lib/db";
import { toDateOnly, toIso } from "@/lib/lead-utils";
import {
  normalizeQuoteDays,
  normalizeQuoteHotels,
  type LeadQuoteDto,
  type LeadQuoteInput,
  type LeadQuoteStatus,
  type QuoteDay,
  type QuoteHotel,
} from "@/lib/quote-defaults";

export type LeadQuoteRow = {
  id: string;
  lead_id: string;
  status: string;
  greeting: string;
  intro_text: string;
  company_contact_name: string;
  company_contact_phone: string;
  destination: string;
  duration_label: string;
  vehicle_label: string;
  amount: string | number;
  amount_note: string;
  inclusions: unknown;
  exclusions: unknown;
  terms: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  adults: number;
  kids: number;
  kids_note: string;
  travel_date: unknown;
  return_date: unknown;
  pickup: string;
  dropoff: string;
  tour_title: string;
  tour_subtitle: string;
  days_json: unknown;
  hotels_json: unknown;
  note: string;
  created_at: unknown;
  updated_at: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

export function leadQuoteToDto(row: LeadQuoteRow): LeadQuoteDto {
  return {
    id: row.id,
    lead_id: row.lead_id,
    status: (row.status === "Sent" ? "Sent" : "Draft") as LeadQuoteStatus,
    greeting: row.greeting ?? "",
    intro_text: row.intro_text ?? "",
    company_contact_name: row.company_contact_name ?? "",
    company_contact_phone: row.company_contact_phone ?? "",
    destination: row.destination ?? "",
    duration_label: row.duration_label ?? "",
    vehicle_label: row.vehicle_label ?? "",
    amount: Number(row.amount) || 0,
    amount_note: row.amount_note ?? "",
    inclusions: asStringArray(row.inclusions),
    exclusions: asStringArray(row.exclusions),
    terms: row.terms ?? "",
    guest_name: row.guest_name ?? "",
    guest_phone: row.guest_phone ?? "",
    guest_email: row.guest_email ?? "",
    adults: Number(row.adults) || 0,
    kids: Number(row.kids) || 0,
    kids_note: row.kids_note ?? "",
    travel_date: toDateOnly(row.travel_date) || null,
    return_date: toDateOnly(row.return_date) || null,
    pickup: row.pickup ?? "",
    dropoff: row.dropoff ?? "",
    tour_title: row.tour_title ?? "",
    tour_subtitle: row.tour_subtitle ?? "",
    days: normalizeQuoteDays(row.days_json),
    hotels: normalizeQuoteHotels(row.hotels_json),
    note: row.note ?? "",
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

const SELECT = `
  SELECT
    id, lead_id, status, greeting, intro_text, company_contact_name, company_contact_phone,
    destination, duration_label, vehicle_label, amount, amount_note, inclusions, exclusions,
    terms, guest_name, guest_phone, guest_email, adults, kids, kids_note, travel_date, return_date,
    pickup, dropoff, tour_title, tour_subtitle, days_json, hotels_json, note, created_at, updated_at
  FROM lead_quotes
`;

export async function findLatestLeadQuote(leadId: string): Promise<LeadQuoteDto | null> {
  const { rows } = await query<LeadQuoteRow>(
    `${SELECT} WHERE lead_id = $1 ORDER BY updated_at DESC LIMIT 1`,
    [leadId]
  );
  return rows[0] ? leadQuoteToDto(rows[0]) : null;
}

export async function findLatestSentLeadQuote(leadId: string): Promise<LeadQuoteDto | null> {
  const { rows } = await query<LeadQuoteRow>(
    `${SELECT} WHERE lead_id = $1 AND status = 'Sent' ORDER BY updated_at DESC LIMIT 1`,
    [leadId]
  );
  return rows[0] ? leadQuoteToDto(rows[0]) : null;
}

export async function findLatestDraftLeadQuote(leadId: string): Promise<LeadQuoteDto | null> {
  const { rows } = await query<LeadQuoteRow>(
    `${SELECT} WHERE lead_id = $1 AND status = 'Draft' ORDER BY updated_at DESC LIMIT 1`,
    [leadId]
  );
  return rows[0] ? leadQuoteToDto(rows[0]) : null;
}

export async function findLeadQuoteById(id: string): Promise<LeadQuoteDto | null> {
  const { rows } = await query<LeadQuoteRow>(`${SELECT} WHERE id = $1`, [id]);
  return rows[0] ? leadQuoteToDto(rows[0]) : null;
}

function sanitizeInput(
  input: LeadQuoteInput
): LeadQuoteInput & { days: QuoteDay[]; hotels: QuoteHotel[] } {
  return {
    greeting: input.greeting?.trim() ?? "",
    intro_text: input.intro_text?.trim() ?? "",
    company_contact_name: input.company_contact_name?.trim() ?? "",
    company_contact_phone: input.company_contact_phone?.trim() ?? "",
    destination: input.destination?.trim() ?? "",
    duration_label: input.duration_label?.trim() ?? "",
    vehicle_label: input.vehicle_label?.trim() ?? "",
    amount: Number.isFinite(Number(input.amount)) ? Math.max(0, Number(input.amount)) : 0,
    amount_note: input.amount_note?.trim() ?? "",
    inclusions: Array.isArray(input.inclusions)
      ? input.inclusions.map((s) => String(s).trim()).filter(Boolean)
      : [],
    exclusions: Array.isArray(input.exclusions)
      ? input.exclusions.map((s) => String(s).trim()).filter(Boolean)
      : [],
    terms: input.terms?.trim() ?? "",
    guest_name: input.guest_name?.trim() ?? "",
    guest_phone: input.guest_phone?.trim() ?? "",
    guest_email: input.guest_email?.trim() ?? "",
    adults: Math.max(0, Math.floor(Number(input.adults) || 0)),
    kids: Math.max(0, Math.floor(Number(input.kids) || 0)),
    kids_note: input.kids_note?.trim() ?? "",
    travel_date: input.travel_date?.trim().slice(0, 10) || null,
    return_date: input.return_date?.trim().slice(0, 10) || null,
    pickup: input.pickup?.trim() ?? "",
    dropoff: input.dropoff?.trim() ?? "",
    tour_title: input.tour_title?.trim() ?? "",
    tour_subtitle: input.tour_subtitle?.trim() ?? "",
    days: normalizeQuoteDays(input.days),
    hotels: normalizeQuoteHotels(input.hotels),
    note: input.note?.trim() ?? "",
  };
}

const INSERT_SQL = `
  INSERT INTO lead_quotes (
    lead_id, status, greeting, intro_text, company_contact_name, company_contact_phone,
    destination, duration_label, vehicle_label, amount, amount_note, inclusions, exclusions,
    terms, guest_name, guest_phone, guest_email, adults, kids, kids_note, travel_date, return_date,
    pickup, dropoff, tour_title, tour_subtitle, days_json, hotels_json, note
  ) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12, $13,
    $14, $15, $16, $17, $18, $19, $20, $21, $22,
    $23, $24, $25, $26, $27::jsonb, $28::jsonb, $29
  )
  RETURNING *
`;

const UPDATE_SQL = `
  UPDATE lead_quotes SET
    greeting = $2,
    intro_text = $3,
    company_contact_name = $4,
    company_contact_phone = $5,
    destination = $6,
    duration_label = $7,
    vehicle_label = $8,
    amount = $9,
    amount_note = $10,
    inclusions = $11,
    exclusions = $12,
    terms = $13,
    guest_name = $14,
    guest_phone = $15,
    guest_email = $16,
    adults = $17,
    kids = $18,
    kids_note = $19,
    travel_date = $20,
    return_date = $21,
    pickup = $22,
    dropoff = $23,
    tour_title = $24,
    tour_subtitle = $25,
    days_json = $26::jsonb,
    hotels_json = $27::jsonb,
    note = $28,
    updated_at = now()
  WHERE id = $1
  RETURNING *
`;

function insertParams(leadId: string, status: LeadQuoteStatus, data: LeadQuoteInput) {
  const s = sanitizeInput(data);
  return [
    leadId,
    status,
    s.greeting,
    s.intro_text,
    s.company_contact_name,
    s.company_contact_phone,
    s.destination,
    s.duration_label,
    s.vehicle_label,
    s.amount,
    s.amount_note,
    s.inclusions,
    s.exclusions,
    s.terms,
    s.guest_name,
    s.guest_phone,
    s.guest_email,
    s.adults,
    s.kids,
    s.kids_note,
    s.travel_date,
    s.return_date,
    s.pickup,
    s.dropoff,
    s.tour_title,
    s.tour_subtitle,
    JSON.stringify(s.days),
    JSON.stringify(s.hotels),
    s.note,
  ];
}

function updateParams(id: string, data: LeadQuoteInput) {
  const s = sanitizeInput(data);
  return [
    id,
    s.greeting,
    s.intro_text,
    s.company_contact_name,
    s.company_contact_phone,
    s.destination,
    s.duration_label,
    s.vehicle_label,
    s.amount,
    s.amount_note,
    s.inclusions,
    s.exclusions,
    s.terms,
    s.guest_name,
    s.guest_phone,
    s.guest_email,
    s.adults,
    s.kids,
    s.kids_note,
    s.travel_date,
    s.return_date,
    s.pickup,
    s.dropoff,
    s.tour_title,
    s.tour_subtitle,
    JSON.stringify(s.days),
    JSON.stringify(s.hotels),
    s.note,
  ];
}

/** Upsert draft: update latest Draft, or create a new Draft. */
export async function upsertLeadQuoteDraft(
  leadId: string,
  input: LeadQuoteInput
): Promise<LeadQuoteDto> {
  const draft = await findLatestDraftLeadQuote(leadId);
  if (draft) {
    const { rows } = await query<LeadQuoteRow>(UPDATE_SQL, updateParams(draft.id, input));
    return leadQuoteToDto(rows[0]);
  }
  const { rows } = await query<LeadQuoteRow>(INSERT_SQL, insertParams(leadId, "Draft", input));
  return leadQuoteToDto(rows[0]);
}

export async function sendLeadQuote(
  leadId: string,
  input: LeadQuoteInput
): Promise<LeadQuoteDto> {
  const draft = await findLatestDraftLeadQuote(leadId);
  if (draft) {
    await query(UPDATE_SQL, updateParams(draft.id, input));
    const { rows: sent } = await query<LeadQuoteRow>(
      `UPDATE lead_quotes SET status = 'Sent', updated_at = now() WHERE id = $1 RETURNING *`,
      [draft.id]
    );
    return leadQuoteToDto(sent[0]);
  }
  const { rows } = await query<LeadQuoteRow>(INSERT_SQL, insertParams(leadId, "Sent", input));
  return leadQuoteToDto(rows[0]);
}
