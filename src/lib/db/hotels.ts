import { query } from "@/lib/db";
import type { GridColumnFilter } from "@/lib/api/grid-query";
import {
  appendGridColumnFilterClauses,
  buildGridOrderBy,
  type GridSqlColumn,
} from "@/lib/db/grid-sql";
import { formatHotelNo, type HotelTemplateStatusValue } from "@/lib/hotel-utils";
import { toIso } from "@/lib/lead-utils";

/** Allowlisted column ids for AG Grid sort / column filters on hotels. */
export const HOTEL_GRID_SQL_COLUMNS: Record<string, GridSqlColumn> = {
  name: { expr: "name", kind: "text" },
  city: { expr: "city", kind: "text" },
  address: { expr: "address", kind: "text" },
  contact_number: { expr: "contact_number", kind: "text" },
  default_room_type: { expr: "default_room_type", kind: "text" },
  typical_rate: { expr: "typical_rate", kind: "number" },
  status: { expr: "status", kind: "text" },
  hotel_no: { expr: "hotel_no", kind: "number" },
  updated: { expr: "updated_at", kind: "timestamptz" },
};

export const HOTEL_GRID_SORT_COLUMNS = Object.keys(HOTEL_GRID_SQL_COLUMNS);

export const HOTEL_GRID_FILTER_ALLOWLIST = Object.fromEntries(
  Object.entries(HOTEL_GRID_SQL_COLUMNS).map(([id, col]) => [
    id,
    col.kind === "timestamptz" || col.kind === "date"
      ? ("date" as const)
      : col.kind === "number"
        ? ("number" as const)
        : ("text" as const),
  ])
);

export type HotelRow = {
  id: string;
  hotel_no: number;
  name: string;
  city: string;
  address: string;
  contact_number: string;
  default_room_type: string;
  typical_rate: string | number;
  notes: string;
  status: string;
  created_at: unknown;
  updated_at: unknown;
};

export type HotelDto = {
  id: string;
  hotel_no: string;
  name: string;
  city: string;
  address: string;
  contact_number: string;
  default_room_type: string;
  typical_rate: number;
  notes: string;
  status: HotelTemplateStatusValue;
  created_at: string;
  updated_at: string;
};

export type CreateHotelInput = {
  name: string;
  city: string;
  address?: string;
  contact_number?: string;
  default_room_type?: string;
  typical_rate?: number;
  notes?: string;
  status?: HotelTemplateStatusValue;
};

export type PatchHotelInput = {
  name?: string;
  city?: string;
  address?: string;
  contact_number?: string;
  default_room_type?: string;
  typical_rate?: number;
  notes?: string;
  status?: HotelTemplateStatusValue;
};

export type ListHotelsFilters = {
  search?: string;
  status?: string[];
  /** AG Grid column sort (allowlisted). */
  sortBy?: string | null;
  sortDir?: "asc" | "desc" | null;
  /** AG Grid Community column filters (allowlisted). */
  colFilters?: GridColumnFilter[];
};

export type ListHotelsPageResult = {
  rows: HotelRow[];
  total: number;
};

const HOTEL_SELECT = `
  SELECT
    id,
    hotel_no,
    name,
    city,
    address,
    contact_number,
    default_room_type,
    typical_rate,
    notes,
    status,
    created_at,
    updated_at
  FROM hotel_templates
`;

export function hotelToDto(row: HotelRow): HotelDto {
  return {
    id: row.id,
    hotel_no: formatHotelNo(row.hotel_no),
    name: row.name,
    city: row.city,
    address: row.address ?? "",
    contact_number: row.contact_number ?? "",
    default_room_type: row.default_room_type ?? "",
    typical_rate: Number(row.typical_rate) || 0,
    notes: row.notes ?? "",
    status: row.status as HotelTemplateStatusValue,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export async function findHotelTemplateById(id: string): Promise<HotelRow | null> {
  const { rows } = await query<HotelRow>(`${HOTEL_SELECT} WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

function buildHotelsFilterClauses(filters: ListHotelsFilters): {
  clauses: string[];
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(name) LIKE $${params.length}
        OR lower(city) LIKE $${params.length}
        OR lower(address) LIKE $${params.length}
        OR lower('ht-' || hotel_no::text) LIKE $${params.length})`
    );
  }
  if (filters.status?.length) {
    params.push(filters.status);
    clauses.push(`status = ANY($${params.length}::text[])`);
  }
  if (filters.colFilters?.length) {
    appendGridColumnFilterClauses(filters.colFilters, HOTEL_GRID_SQL_COLUMNS, clauses, params);
  }

  return { clauses, params };
}

function hotelsOrderBy(filters: ListHotelsFilters): string {
  return buildGridOrderBy(
    filters.sortBy && filters.sortDir
      ? { sortBy: filters.sortBy, sortDir: filters.sortDir }
      : null,
    HOTEL_GRID_SQL_COLUMNS,
    "updated_at DESC, hotel_no DESC"
  );
}

export async function listHotelTemplates(filters: ListHotelsFilters = {}): Promise<HotelRow[]> {
  const { clauses, params } = buildHotelsFilterClauses(filters);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<HotelRow>(
    `${HOTEL_SELECT} ${where} ORDER BY ${hotelsOrderBy(filters)}`,
    params
  );
  return rows;
}

export async function listHotelTemplatesPage(
  filters: ListHotelsFilters = {},
  options: { limit: number; offset: number }
): Promise<ListHotelsPageResult> {
  const limit = Math.min(Math.max(Math.floor(options.limit) || 25, 1), 100);
  const offset = Math.max(Math.floor(options.offset) || 0, 0);
  const { clauses, params } = buildHotelsFilterClauses(filters);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM hotel_templates ${where}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  if (total === 0 || offset >= total) {
    return { rows: [], total };
  }

  const { rows } = await query<HotelRow>(
    `${HOTEL_SELECT} ${where}
     ORDER BY ${hotelsOrderBy(filters)}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { rows, total };
}

export async function createHotelTemplate(input: CreateHotelInput): Promise<HotelRow> {
  const status = input.status ?? "Draft";
  const { rows } = await query<{ id: string }>(
    `INSERT INTO hotel_templates (
      name, city, address, contact_number, default_room_type, typical_rate, notes, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      input.name.trim(),
      input.city.trim(),
      input.address?.trim() ?? "",
      input.contact_number?.trim() ?? "",
      input.default_room_type?.trim() ?? "",
      Number(input.typical_rate) || 0,
      input.notes?.trim() ?? "",
      status,
    ]
  );

  const hotel = await findHotelTemplateById(rows[0].id);
  if (!hotel) throw new Error("Failed to load created hotel template");
  return hotel;
}

export async function patchHotelTemplate(id: string, patch: PatchHotelInput): Promise<HotelRow> {
  const existing = await findHotelTemplateById(id);
  if (!existing) throw new Error("NOT_FOUND");

  await query(
    `UPDATE hotel_templates SET
      name = $2,
      city = $3,
      address = $4,
      contact_number = $5,
      default_room_type = $6,
      typical_rate = $7,
      notes = $8,
      status = $9,
      updated_at = now()
     WHERE id = $1`,
    [
      id,
      patch.name !== undefined ? patch.name.trim() : existing.name,
      patch.city !== undefined ? patch.city.trim() : existing.city,
      patch.address !== undefined ? patch.address.trim() : existing.address,
      patch.contact_number !== undefined ? patch.contact_number.trim() : existing.contact_number,
      patch.default_room_type !== undefined
        ? patch.default_room_type.trim()
        : existing.default_room_type,
      patch.typical_rate !== undefined
        ? Number(patch.typical_rate) || 0
        : Number(existing.typical_rate) || 0,
      patch.notes !== undefined ? patch.notes.trim() : existing.notes,
      patch.status !== undefined ? patch.status : existing.status,
    ]
  );

  const hotel = await findHotelTemplateById(id);
  if (!hotel) throw new Error("NOT_FOUND");
  return hotel;
}

export async function deleteHotelTemplate(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM hotel_templates WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
