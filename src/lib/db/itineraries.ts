import type { PoolClient } from "pg";
import { getPool, query } from "@/lib/db";
import type { ItineraryDay } from "@/lib/data";
import {
  clampDiscountPercentage,
  clampVarchar,
  formatItineraryNo,
  isValidSlug,
  normalizeDaysPlan,
  parseInclusions,
  slugify,
  type ItineraryStatusValue,
} from "@/lib/itinerary-utils";
import { toIso } from "@/lib/lead-utils";

export type ItineraryRow = {
  id: string;
  itinerary_no: number;
  name: string;
  slug: string;
  tour_package: string;
  subtitle: string;
  overview: string;
  inclusions: unknown;
  starting_from: string | number;
  discount_percentage: string | number;
  nights: string;
  days: string;
  status: string;
  created_at: unknown;
  updated_at: unknown;
};

export type ItineraryDayRow = {
  id: string;
  itinerary_id: string;
  day_number: number;
  title: string;
  detail: string;
  hotel_id: string | null;
  hotel_name: string;
};

export type ItineraryDayDto = {
  day: number;
  title: string;
  detail: string;
  hotel_id?: string;
  hotel_name?: string;
};

export type ItineraryDto = {
  id: string;
  itinerary_no: string;
  name: string;
  slug: string;
  tour_package: string;
  subtitle: string;
  overview: string;
  inclusions: string[];
  starting_from: number;
  discount_percentage: number;
  nights: string;
  days: string;
  status: ItineraryStatusValue;
  days_plan: ItineraryDayDto[];
  created_at: string;
  updated_at: string;
};

export type CreateItineraryInput = {
  name: string;
  slug?: string;
  tour_package: string;
  subtitle?: string;
  overview?: string;
  inclusions?: string[];
  starting_from?: number;
  discount_percentage?: number;
  nights?: string;
  days?: string;
  status?: ItineraryStatusValue;
  days_plan: ItineraryDay[];
};

export type PatchItineraryInput = {
  name?: string;
  slug?: string;
  tour_package?: string;
  subtitle?: string;
  overview?: string;
  inclusions?: string[];
  starting_from?: number;
  discount_percentage?: number;
  nights?: string;
  days?: string;
  status?: ItineraryStatusValue;
  days_plan?: ItineraryDay[];
};

export type ListItinerariesFilters = {
  search?: string;
  status?: string[];
};

const TEMPLATE_SELECT = `
  SELECT
    id,
    itinerary_no,
    name,
    slug,
    tour_package,
    subtitle,
    overview,
    inclusions,
    starting_from,
    discount_percentage,
    nights,
    days,
    status,
    created_at,
    updated_at
  FROM itinerary_templates
`;

function dayRowsToDto(rows: ItineraryDayRow[]): ItineraryDayDto[] {
  return rows.map((row) => ({
    day: row.day_number,
    title: row.title,
    detail: row.detail ?? "",
    ...(row.hotel_id ? { hotel_id: row.hotel_id } : {}),
    ...(row.hotel_name ? { hotel_name: row.hotel_name } : {}),
  }));
}

export function itineraryToDto(row: ItineraryRow, dayRows: ItineraryDayRow[] = []): ItineraryDto {
  return {
    id: row.id,
    itinerary_no: formatItineraryNo(row.itinerary_no),
    name: row.name,
    slug: row.slug,
    tour_package: row.tour_package,
    subtitle: row.subtitle ?? "",
    overview: row.overview ?? "",
    inclusions: parseInclusions(row.inclusions),
    starting_from: Number(row.starting_from) || 0,
    discount_percentage: clampDiscountPercentage(row.discount_percentage),
    nights: row.nights ?? "",
    days: row.days ?? "",
    status: row.status as ItineraryStatusValue,
    days_plan: dayRowsToDto(dayRows),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

async function listDaysForItinerary(itineraryId: string): Promise<ItineraryDayRow[]> {
  const { rows } = await query<ItineraryDayRow>(
    `SELECT id, itinerary_id, day_number, title, detail, hotel_id, hotel_name
     FROM itinerary_template_days
     WHERE itinerary_id = $1
     ORDER BY day_number ASC`,
    [itineraryId]
  );
  return rows;
}

async function listDaysForItineraries(ids: string[]): Promise<Map<string, ItineraryDayRow[]>> {
  const map = new Map<string, ItineraryDayRow[]>();
  if (!ids.length) return map;
  const { rows } = await query<ItineraryDayRow>(
    `SELECT id, itinerary_id, day_number, title, detail, hotel_id, hotel_name
     FROM itinerary_template_days
     WHERE itinerary_id = ANY($1::uuid[])
     ORDER BY itinerary_id ASC, day_number ASC`,
    [ids]
  );
  for (const row of rows) {
    const list = map.get(row.itinerary_id) ?? [];
    list.push(row);
    map.set(row.itinerary_id, list);
  }
  return map;
}

export async function findItineraryTemplateById(id: string): Promise<{
  row: ItineraryRow;
  days: ItineraryDayRow[];
} | null> {
  const { rows } = await query<ItineraryRow>(`${TEMPLATE_SELECT} WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  const days = await listDaysForItinerary(id);
  return { row: rows[0], days };
}

export async function findItineraryTemplateBySlug(slug: string): Promise<{
  row: ItineraryRow;
  days: ItineraryDayRow[];
} | null> {
  const { rows } = await query<ItineraryRow>(`${TEMPLATE_SELECT} WHERE slug = $1`, [slug]);
  if (!rows[0]) return null;
  const days = await listDaysForItinerary(rows[0].id);
  return { row: rows[0], days };
}

export async function listItineraryTemplates(
  filters: ListItinerariesFilters = {}
): Promise<{ row: ItineraryRow; days: ItineraryDayRow[] }[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(name) LIKE $${params.length}
        OR lower(tour_package) LIKE $${params.length}
        OR lower(slug) LIKE $${params.length}
        OR lower('it-' || itinerary_no::text) LIKE $${params.length}
        OR lower(subtitle) LIKE $${params.length})`
    );
  }
  if (filters.status?.length) {
    params.push(filters.status);
    clauses.push(`status = ANY($${params.length}::text[])`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<ItineraryRow>(
    `${TEMPLATE_SELECT} ${where} ORDER BY updated_at DESC, itinerary_no DESC`,
    params
  );
  const daysMap = await listDaysForItineraries(rows.map((r) => r.id));
  return rows.map((row) => ({ row, days: daysMap.get(row.id) ?? [] }));
}

export async function allocateUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = clampVarchar(slugify(base) || "itinerary", 255);
  if (!isValidSlug(candidate)) candidate = "itinerary";

  for (let i = 0; i < 50; i++) {
    const trySlug = i === 0 ? candidate : clampVarchar(`${candidate}-${i + 1}`, 255);
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM itinerary_templates WHERE slug = $1 ${excludeId ? "AND id <> $2" : ""} LIMIT 1`,
      excludeId ? [trySlug, excludeId] : [trySlug]
    );
    if (!rows[0]) return trySlug;
  }
  return clampVarchar(`${candidate}-${Date.now()}`, 255);
}

async function assertHotelIdsExist(
  client: PoolClient,
  hotelIds: string[]
) {
  const unique = [...new Set(hotelIds.filter(Boolean))];
  if (!unique.length) return;
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM hotel_templates WHERE id = ANY($1::uuid[])`,
    [unique]
  );
  const found = new Set(rows.map((r) => r.id));
  for (const id of unique) {
    if (!found.has(id)) {
      throw new Error(`INVALID_HOTEL:${id}`);
    }
  }
}

async function replaceDays(client: PoolClient, itineraryId: string, daysPlan: ItineraryDay[]) {
  const normalized = normalizeDaysPlan(daysPlan);
  if (!normalized.length) throw new Error("DAYS_REQUIRED");

  const hotelIds = normalized
    .map((d) => d.hotelId)
    .filter((id): id is string => Boolean(id));
  await assertHotelIdsExist(client, hotelIds);

  await client.query(`DELETE FROM itinerary_template_days WHERE itinerary_id = $1`, [itineraryId]);

  for (const day of normalized) {
    await client.query(
      `INSERT INTO itinerary_template_days (
        itinerary_id, day_number, title, detail, hotel_id, hotel_name
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        itineraryId,
        day.day,
        day.title,
        day.detail ?? "",
        day.hotelId || null,
        day.hotelName ?? "",
      ]
    );
  }
}

export async function createItineraryTemplate(input: CreateItineraryInput): Promise<{
  row: ItineraryRow;
  days: ItineraryDayRow[];
}> {
  const name = input.name.trim();
  const tourPackage = input.tour_package.trim();
  if (!name) throw new Error("NAME_REQUIRED");
  if (!tourPackage) throw new Error("TOUR_PACKAGE_REQUIRED");

  const daysPlan = normalizeDaysPlan(input.days_plan);
  if (!daysPlan.length) throw new Error("DAYS_REQUIRED");
  if (daysPlan.some((d) => !d.title.trim())) throw new Error("DAY_TITLE_REQUIRED");

  let slug = clampVarchar(input.slug ? slugify(input.slug) : slugify(name), 255);
  if (!slug || !isValidSlug(slug)) {
    slug = await allocateUniqueSlug(name || "itinerary");
  } else {
    slug = await allocateUniqueSlug(slug);
  }

  const status = input.status ?? "Draft";
  const nights = clampVarchar(input.nights ?? "", 255);
  const days = clampVarchar(input.days ?? "", 255);
  const inclusions = input.inclusions ?? [];

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO itinerary_templates (
        name, slug, tour_package, subtitle, overview, inclusions,
        starting_from, discount_percentage, nights, days, status
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
      RETURNING id`,
      [
        name,
        slug,
        tourPackage,
        input.subtitle?.trim() ?? "",
        input.overview?.trim() ?? "",
        JSON.stringify(inclusions),
        Number(input.starting_from) || 0,
        clampDiscountPercentage(input.discount_percentage),
        nights,
        days,
        status,
      ]
    );
    const id = inserted.rows[0].id;
    await replaceDays(client, id, daysPlan);
    await client.query("COMMIT");

    const found = await findItineraryTemplateById(id);
    if (!found) throw new Error("Failed to load created itinerary");
    return found;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function patchItineraryTemplate(
  id: string,
  patch: PatchItineraryInput
): Promise<{ row: ItineraryRow; days: ItineraryDayRow[] }> {
  const existing = await findItineraryTemplateById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const name = patch.name !== undefined ? patch.name.trim() : existing.row.name;
  const tourPackage =
    patch.tour_package !== undefined ? patch.tour_package.trim() : existing.row.tour_package;
  if (!name) throw new Error("NAME_REQUIRED");
  if (!tourPackage) throw new Error("TOUR_PACKAGE_REQUIRED");

  let slug = existing.row.slug;
  if (patch.slug !== undefined) {
    const next = clampVarchar(slugify(patch.slug), 255);
    if (!next || !isValidSlug(next)) throw new Error("SLUG_INVALID");
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM itinerary_templates WHERE slug = $1 AND id <> $2 LIMIT 1`,
      [next, id]
    );
    if (rows[0]) throw new Error("SLUG_TAKEN");
    slug = next;
  }

  const daysPlan =
    patch.days_plan !== undefined
      ? normalizeDaysPlan(patch.days_plan)
      : existing.days.map((d) => ({
          day: d.day_number,
          title: d.title,
          detail: d.detail,
          hotelId: d.hotel_id || undefined,
          hotelName: d.hotel_name || undefined,
        }));

  if (!daysPlan.length) throw new Error("DAYS_REQUIRED");
  if (daysPlan.some((d) => !d.title.trim())) throw new Error("DAY_TITLE_REQUIRED");

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE itinerary_templates SET
        name = $2,
        slug = $3,
        tour_package = $4,
        subtitle = $5,
        overview = $6,
        inclusions = $7::jsonb,
        starting_from = $8,
        discount_percentage = $9,
        nights = $10,
        days = $11,
        status = $12,
        updated_at = now()
       WHERE id = $1`,
      [
        id,
        name,
        slug,
        tourPackage,
        patch.subtitle !== undefined ? patch.subtitle.trim() : existing.row.subtitle,
        patch.overview !== undefined ? patch.overview.trim() : existing.row.overview,
        JSON.stringify(
          patch.inclusions !== undefined
            ? patch.inclusions
            : parseInclusions(existing.row.inclusions)
        ),
        patch.starting_from !== undefined
          ? Number(patch.starting_from) || 0
          : Number(existing.row.starting_from) || 0,
        patch.discount_percentage !== undefined
          ? clampDiscountPercentage(patch.discount_percentage)
          : clampDiscountPercentage(existing.row.discount_percentage),
        patch.nights !== undefined
          ? clampVarchar(patch.nights, 255)
          : existing.row.nights,
        patch.days !== undefined ? clampVarchar(patch.days, 255) : existing.row.days,
        patch.status !== undefined ? patch.status : existing.row.status,
      ]
    );

    if (patch.days_plan !== undefined) {
      await replaceDays(client, id, daysPlan);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const found = await findItineraryTemplateById(id);
  if (!found) throw new Error("NOT_FOUND");
  return found;
}

export async function deleteItineraryTemplate(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM itinerary_templates WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error &&
    "code" in error &&
    String((error as { code?: string }).code) === "23505"
  );
}
