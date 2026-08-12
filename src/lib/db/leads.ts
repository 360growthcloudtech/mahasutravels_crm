import { query } from "@/lib/db";
import { getDefaultStatusCode } from "@/lib/db/masters";
import {
  formatLeadNo,
  normalizePhone,
  toDateOnly,
  toIso,
  toTimeOnly,
} from "@/lib/lead-utils";

export type LeadRow = {
  id: string;
  lead_no: number;
  name: string;
  phone: string;
  phone_normalized: string;
  email: string;
  pickup: string;
  drop_location: string;
  car: string;
  days: number;
  pickup_date: unknown;
  drop_date: unknown;
  next_follow_up_date: unknown;
  next_follow_up_time: unknown;
  price: string | number;
  source: string;
  city: string;
  website: string | null;
  tour_package: string;
  itinerary_template_id: string | null;
  adults: number;
  kids: number;
  notes: string;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  inquiry_count: number;
  previous_lead_id: string | null;
  created_at: unknown;
  updated_at: unknown;
  last_inquiry_at: unknown;
};

export type LeadDto = {
  id: string;
  lead_no: string;
  name: string;
  phone: string;
  email: string;
  pickup: string;
  drop: string;
  car: string;
  days: number;
  pickup_date: string;
  drop_date: string;
  next_follow_up_date: string;
  next_follow_up_time: string;
  price: number;
  source: string;
  city: string;
  website: string | null;
  tour_package: string;
  itinerary_template_id: string | null;
  adults: number;
  kids: number;
  notes: string;
  status: string;
  assigned_to: { id: string; name: string } | null;
  inquiry_count: number;
  previous_lead_id: string | null;
  created_at: string;
  updated_at: string;
  last_inquiry_at: string;
};

export type LeadCommentRow = {
  id: string;
  lead_id: string;
  author_id: string | null;
  author_name: string;
  text: string;
  created_at: unknown;
};

export type LeadActivityRow = {
  id: string;
  lead_id: string;
  action: string;
  label: string;
  detail: string | null;
  actor: string;
  created_at: unknown;
};

export type LeadCommentDto = {
  id: string;
  text: string;
  author: string;
  created_at: string;
};

export type LeadActivityDto = {
  id: string;
  action: string;
  label: string;
  detail?: string;
  actor: string;
  created_at: string;
};

export type IngestLeadInput = {
  name: string;
  phone: string;
  email?: string;
  pickup?: string;
  drop?: string;
  car?: string;
  days?: number;
  pickup_date?: string | null;
  drop_date?: string | null;
  next_follow_up_date?: string | null;
  next_follow_up_time?: string | null;
  price?: number;
  source: string;
  city?: string;
  website?: string | null;
  tour_package?: string;
  itinerary_template_id?: string | null;
  adults?: number;
  kids?: number;
  notes?: string;
  status?: string;
  assigned_to?: string | null;
};

export type ListLeadsFilters = {
  search?: string;
  status?: string[];
  source?: string[];
  assigned_to?: string[];
  website?: string[];
};

const LEAD_SELECT = `
  SELECT
    l.id,
    l.lead_no,
    l.name,
    l.phone,
    l.phone_normalized,
    l.email,
    l.pickup,
    l.drop_location,
    l.car,
    l.days,
    l.pickup_date::text AS pickup_date,
    l.drop_date::text AS drop_date,
    l.next_follow_up_date::text AS next_follow_up_date,
    l.next_follow_up_time::text AS next_follow_up_time,
    l.price,
    l.source,
    l.city,
    l.website,
    l.tour_package,
    l.itinerary_template_id,
    l.adults,
    l.kids,
    l.notes,
    l.status,
    l.assigned_to,
    u.name AS assigned_to_name,
    l.inquiry_count,
    l.previous_lead_id,
    l.created_at,
    l.updated_at,
    l.last_inquiry_at
  FROM leads l
  LEFT JOIN users u ON u.id = l.assigned_to
`;

export function leadToDto(row: LeadRow): LeadDto {
  return {
    id: row.id,
    lead_no: formatLeadNo(row.lead_no),
    name: row.name,
    phone: row.phone,
    email: row.email ?? "",
    pickup: row.pickup ?? "",
    drop: row.drop_location ?? "",
    car: row.car ?? "",
    days: Number(row.days) || 0,
    pickup_date: toDateOnly(row.pickup_date),
    drop_date: toDateOnly(row.drop_date),
    next_follow_up_date: toDateOnly(row.next_follow_up_date),
    next_follow_up_time: toTimeOnly(row.next_follow_up_time),
    price: Number(row.price) || 0,
    source: row.source,
    city: row.city ?? "",
    website: row.website,
    tour_package: row.tour_package ?? "",
    itinerary_template_id: row.itinerary_template_id ?? null,
    adults: Number(row.adults) || 0,
    kids: Number(row.kids) || 0,
    notes: row.notes ?? "",
    status: row.status,
    assigned_to:
      row.assigned_to && row.assigned_to_name
        ? { id: row.assigned_to, name: row.assigned_to_name }
        : null,
    inquiry_count: Number(row.inquiry_count) || 1,
    previous_lead_id: row.previous_lead_id,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    last_inquiry_at: toIso(row.last_inquiry_at),
  };
}

export function commentToDto(row: LeadCommentRow): LeadCommentDto {
  return {
    id: row.id,
    text: row.text,
    author: row.author_name,
    created_at: toIso(row.created_at),
  };
}

export function activityToDto(row: LeadActivityRow): LeadActivityDto {
  return {
    id: row.id,
    action: row.action,
    label: row.label,
    detail: row.detail || undefined,
    actor: row.actor,
    created_at: toIso(row.created_at),
  };
}

export async function findLeadById(id: string): Promise<LeadRow | null> {
  const { rows } = await query<LeadRow>(`${LEAD_SELECT} WHERE l.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findOpenLeadByPhone(phoneNormalized: string): Promise<LeadRow | null> {
  if (!phoneNormalized) return null;
  const { rows } = await query<LeadRow>(
    `${LEAD_SELECT}
     JOIN lead_statuses ls ON ls.code = l.status
     WHERE l.phone_normalized = $1
       AND ls.is_closed = false
     ORDER BY l.last_inquiry_at DESC
     LIMIT 1`,
    [phoneNormalized]
  );
  return rows[0] ?? null;
}

export async function findLatestLeadByPhone(phoneNormalized: string): Promise<LeadRow | null> {
  if (!phoneNormalized) return null;
  const { rows } = await query<LeadRow>(
    `${LEAD_SELECT}
     WHERE l.phone_normalized = $1
     ORDER BY l.created_at DESC
     LIMIT 1`,
    [phoneNormalized]
  );
  return rows[0] ?? null;
}

export async function listLeads(filters: ListLeadsFilters = {}): Promise<LeadRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(l.name) LIKE $${params.length} OR lower(l.email) LIKE $${params.length} OR l.phone_normalized LIKE $${params.length} OR lower(l.phone) LIKE $${params.length})`
    );
  }
  if (filters.status?.length) {
    params.push(filters.status);
    clauses.push(`l.status = ANY($${params.length}::text[])`);
  }
  if (filters.source?.length) {
    params.push(filters.source);
    clauses.push(`l.source = ANY($${params.length}::text[])`);
  }
  if (filters.assigned_to?.length) {
    const unassigned = filters.assigned_to.includes("unassigned");
    const ids = filters.assigned_to.filter((id) => id && id !== "unassigned");
    if (unassigned && ids.length) {
      params.push(ids);
      clauses.push(`(l.assigned_to IS NULL OR l.assigned_to = ANY($${params.length}::uuid[]))`);
    } else if (unassigned) {
      clauses.push(`l.assigned_to IS NULL`);
    } else {
      params.push(ids);
      clauses.push(`l.assigned_to = ANY($${params.length}::uuid[])`);
    }
  }
  if (filters.website?.length) {
    params.push(filters.website);
    clauses.push(`l.website = ANY($${params.length}::text[])`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<LeadRow>(
    `${LEAD_SELECT} ${where} ORDER BY l.last_inquiry_at DESC, l.created_at DESC`,
    params
  );
  return rows;
}

async function insertActivity(
  leadId: string,
  action: string,
  label: string,
  actor: string,
  detail?: string
) {
  await query(
    `INSERT INTO lead_activity (lead_id, action, label, detail, actor)
     VALUES ($1, $2, $3, $4, $5)`,
    [leadId, action, label, detail ?? null, actor]
  );
}

export async function createLead(input: IngestLeadInput, actor: string): Promise<LeadRow> {
  const phoneNormalized = normalizePhone(input.phone);
  const previous = await findLatestLeadByPhone(phoneNormalized);
  const status = input.status || (await getDefaultStatusCode());

  const { rows } = await query<{ id: string }>(
    `INSERT INTO leads (
      name, phone, phone_normalized, email, pickup, drop_location, car, days,
      pickup_date, drop_date, next_follow_up_date, next_follow_up_time, price, source, city, website, tour_package,
      itinerary_template_id, adults, kids, notes, status, assigned_to, previous_lead_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, $24
    )
    RETURNING id`,
    [
      input.name,
      input.phone.trim(),
      phoneNormalized,
      input.email?.trim() ?? "",
      input.pickup?.trim() ?? "",
      input.drop?.trim() ?? "",
      input.car?.trim() ?? "",
      Number(input.days) || 0,
      input.pickup_date || null,
      input.drop_date || null,
      input.next_follow_up_date || null,
      input.next_follow_up_time || null,
      Number(input.price) || 0,
      input.source,
      input.city?.trim() ?? "",
      input.website?.trim() || null,
      input.tour_package?.trim() ?? "",
      input.itinerary_template_id || null,
      Number(input.adults) || 0,
      Number(input.kids) || 0,
      input.notes?.trim() ?? "",
      status,
      input.assigned_to || null,
      previous?.id ?? null,
    ]
  );

  const id = rows[0].id;
  const detailParts = [`Source: ${input.source}`];
  if (previous) detailParts.push(`Repeat customer · previous ${formatLeadNo(previous.lead_no)}`);
  await insertActivity(id, "created", "Lead created", actor, detailParts.join(" · "));
  if (input.assigned_to) {
    const created = await findLeadById(id);
    await insertActivity(
      id,
      "assigned",
      `Assigned to ${created?.assigned_to_name ?? "agent"}`,
      actor,
      "Manual assignment on create"
    );
  }
  const lead = await findLeadById(id);
  if (!lead) throw new Error("Failed to load created lead");
  return lead;
}

export async function updateLeadFromInquiry(
  id: string,
  input: IngestLeadInput,
  actor: string
): Promise<LeadRow> {
  const existing = await findLeadById(id);
  if (!existing) throw new Error("Lead not found");

  const email = input.email?.trim() ? input.email.trim() : existing.email;
  const name = input.name.trim() || existing.name;
  const pickup = input.pickup?.trim() ? input.pickup.trim() : existing.pickup;
  const drop = input.drop?.trim() ? input.drop.trim() : existing.drop_location;
  const car = input.car?.trim() ? input.car.trim() : existing.car;
  const days = input.days != null ? Number(input.days) || 0 : Number(existing.days) || 0;
  const pickupDate = input.pickup_date !== undefined ? input.pickup_date || null : toDateOnly(existing.pickup_date) || null;
  const dropDate = input.drop_date !== undefined ? input.drop_date || null : toDateOnly(existing.drop_date) || null;
  const price = input.price != null ? Number(input.price) || 0 : Number(existing.price) || 0;
  const city = input.city?.trim() ? input.city.trim() : existing.city;
  const website = input.website !== undefined ? input.website?.trim() || null : existing.website;
  const tourPackage = input.tour_package?.trim() ? input.tour_package.trim() : existing.tour_package;
  const itineraryTemplateId =
    input.itinerary_template_id !== undefined
      ? input.itinerary_template_id || null
      : existing.itinerary_template_id;
  const adults = input.adults != null ? Number(input.adults) || 0 : Number(existing.adults) || 0;
  const kids = input.kids != null ? Number(input.kids) || 0 : Number(existing.kids) || 0;
  const notes = input.notes?.trim() ? input.notes.trim() : existing.notes;

  await query(
    `UPDATE leads SET
      name = $2,
      phone = $3,
      email = $4,
      pickup = $5,
      drop_location = $6,
      car = $7,
      days = $8,
      pickup_date = $9,
      drop_date = $10,
      price = $11,
      source = $12,
      city = $13,
      website = $14,
      tour_package = $15,
      itinerary_template_id = $16,
      adults = $17,
      kids = $18,
      notes = $19,
      inquiry_count = inquiry_count + 1,
      updated_at = now(),
      last_inquiry_at = now()
     WHERE id = $1`,
    [
      id,
      name,
      input.phone.trim() || existing.phone,
      email,
      pickup,
      drop,
      car,
      days,
      pickupDate,
      dropDate,
      price,
      input.source || existing.source,
      city,
      website,
      tourPackage,
      itineraryTemplateId,
      adults,
      kids,
      notes,
    ]
  );

  const route = [pickup, drop].filter(Boolean).join(" → ") || "trip details updated";
  await insertActivity(
    id,
    "repeat_inquiry",
    "Repeat inquiry received",
    actor,
    `${input.source} · ${route}`
  );

  const updated = await findLeadById(id);
  if (!updated) throw new Error("Failed to load updated lead");
  return updated;
}

export async function ingestLead(
  input: IngestLeadInput,
  actor: string
): Promise<{ lead: LeadRow; repeat_inquiry: boolean }> {
  const phoneNormalized = normalizePhone(input.phone);
  const open = await findOpenLeadByPhone(phoneNormalized);
  if (open) {
    const lead = await updateLeadFromInquiry(open.id, input, actor);
    return { lead, repeat_inquiry: true };
  }

  try {
    const lead = await createLead(input, actor);
    return { lead, repeat_inquiry: false };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code !== "23505") throw error;
    const raced = await findOpenLeadByPhone(phoneNormalized);
    if (!raced) throw error;
    const lead = await updateLeadFromInquiry(raced.id, input, actor);
    return { lead, repeat_inquiry: true };
  }
}

export type PatchLeadInput = {
  name?: string;
  phone?: string;
  email?: string;
  pickup?: string;
  drop?: string;
  car?: string;
  days?: number;
  pickup_date?: string | null;
  drop_date?: string | null;
  next_follow_up_date?: string | null;
  next_follow_up_time?: string | null;
  price?: number;
  source?: string;
  city?: string;
  website?: string | null;
  tour_package?: string;
  itinerary_template_id?: string | null;
  adults?: number;
  kids?: number;
  notes?: string;
  status?: string;
  assigned_to?: string | null;
};

export async function patchLead(
  id: string,
  patch: PatchLeadInput,
  actor: string
): Promise<LeadRow> {
  const existing = await findLeadById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const phone = patch.phone !== undefined ? patch.phone.trim() : existing.phone;
  const phoneNormalized = patch.phone !== undefined ? normalizePhone(phone) : existing.phone_normalized;
  const nextStatus = patch.status ?? existing.status;
  const nextAssigned = patch.assigned_to !== undefined ? patch.assigned_to || null : existing.assigned_to;
  const nextItineraryId =
    patch.itinerary_template_id !== undefined
      ? patch.itinerary_template_id || null
      : existing.itinerary_template_id;
  const nextTourPackage =
    patch.tour_package !== undefined ? patch.tour_package.trim() : existing.tour_package;

  await query(
    `UPDATE leads SET
      name = $2,
      phone = $3,
      phone_normalized = $4,
      email = $5,
      pickup = $6,
      drop_location = $7,
      car = $8,
      days = $9,
      pickup_date = $10,
      drop_date = $11,
      next_follow_up_date = $12,
      next_follow_up_time = $13,
      price = $14,
      source = $15,
      city = $16,
      website = $17,
      tour_package = $18,
      itinerary_template_id = $19,
      adults = $20,
      kids = $21,
      notes = $22,
      status = $23,
      assigned_to = $24,
      updated_at = now()
     WHERE id = $1`,
    [
      id,
      patch.name !== undefined ? patch.name.trim() : existing.name,
      phone,
      phoneNormalized,
      patch.email !== undefined ? patch.email.trim() : existing.email,
      patch.pickup !== undefined ? patch.pickup.trim() : existing.pickup,
      patch.drop !== undefined ? patch.drop.trim() : existing.drop_location,
      patch.car !== undefined ? patch.car.trim() : existing.car,
      patch.days !== undefined ? Number(patch.days) || 0 : Number(existing.days) || 0,
      patch.pickup_date !== undefined ? patch.pickup_date || null : toDateOnly(existing.pickup_date) || null,
      patch.drop_date !== undefined ? patch.drop_date || null : toDateOnly(existing.drop_date) || null,
      patch.next_follow_up_date !== undefined
        ? patch.next_follow_up_date || null
        : toDateOnly(existing.next_follow_up_date) || null,
      patch.next_follow_up_time !== undefined
        ? patch.next_follow_up_time || null
        : toTimeOnly(existing.next_follow_up_time) || null,
      patch.price !== undefined ? Number(patch.price) || 0 : Number(existing.price) || 0,
      patch.source !== undefined ? patch.source.trim() : existing.source,
      patch.city !== undefined ? patch.city.trim() : existing.city,
      patch.website !== undefined ? patch.website?.trim() || null : existing.website,
      nextTourPackage,
      nextItineraryId,
      patch.adults !== undefined ? Number(patch.adults) || 0 : Number(existing.adults) || 0,
      patch.kids !== undefined ? Number(patch.kids) || 0 : Number(existing.kids) || 0,
      patch.notes !== undefined ? patch.notes.trim() : existing.notes,
      nextStatus,
      nextAssigned,
    ]
  );

  if (patch.status && patch.status !== existing.status) {
    await insertActivity(
      id,
      "status_changed",
      `Status changed to ${patch.status}`,
      actor,
      `${existing.status} → ${patch.status}`
    );
  }
  if (patch.assigned_to !== undefined && nextAssigned !== existing.assigned_to) {
    const updated = await findLeadById(id);
    await insertActivity(
      id,
      "assigned",
      nextAssigned ? `Assigned to ${updated?.assigned_to_name ?? "agent"}` : "Unassigned",
      actor
    );
  }
  const fieldUpdates = Object.keys(patch).filter(
    (key) => !["status", "assigned_to"].includes(key)
  );
  if (fieldUpdates.length > 0) {
    await insertActivity(id, "updated", "Lead details updated", actor, `Edited by ${actor}`);
  }

  const lead = await findLeadById(id);
  if (!lead) throw new Error("NOT_FOUND");
  return lead;
}

export async function deleteLead(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM leads WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listLeadComments(leadId: string): Promise<LeadCommentRow[]> {
  const { rows } = await query<LeadCommentRow>(
    `SELECT id, lead_id, author_id, author_name, text, created_at
     FROM lead_comments
     WHERE lead_id = $1
     ORDER BY created_at DESC`,
    [leadId]
  );
  return rows;
}

export async function addLeadComment(
  leadId: string,
  text: string,
  authorId: string,
  authorName: string
): Promise<LeadCommentRow> {
  const { rows } = await query<LeadCommentRow>(
    `INSERT INTO lead_comments (lead_id, author_id, author_name, text)
     VALUES ($1, $2, $3, $4)
     RETURNING id, lead_id, author_id, author_name, text, created_at`,
    [leadId, authorId, authorName, text]
  );
  await query(`UPDATE leads SET updated_at = now() WHERE id = $1`, [leadId]);
  await insertActivity(leadId, "comment_added", "Comment added", authorName, text);
  return rows[0];
}

export async function listLeadActivity(leadId: string): Promise<LeadActivityRow[]> {
  const { rows } = await query<LeadActivityRow>(
    `SELECT id, lead_id, action, label, detail, actor, created_at
     FROM lead_activity
     WHERE lead_id = $1
     ORDER BY created_at DESC`,
    [leadId]
  );
  return rows;
}

export async function userExists(id: string): Promise<boolean> {
  const { rows } = await query<{ id: string }>(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [id]);
  return Boolean(rows[0]);
}

export function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error && "code" in error && String((error as { code?: string }).code) === "23505";
}
