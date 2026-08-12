import { query } from "@/lib/db";
import { formatHotelNo, type HotelTemplateStatusValue } from "@/lib/hotel-utils";
import { toIso } from "@/lib/lead-utils";

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

export async function listHotelTemplates(filters: ListHotelsFilters = {}): Promise<HotelRow[]> {
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

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<HotelRow>(
    `${HOTEL_SELECT} ${where} ORDER BY updated_at DESC, hotel_no DESC`,
    params
  );
  return rows;
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
