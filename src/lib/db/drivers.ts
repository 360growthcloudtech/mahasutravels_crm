import { query } from "@/lib/db";
import type { GridColumnFilter } from "@/lib/api/grid-query";
import {
  appendGridColumnFilterClauses,
  buildGridOrderBy,
  type GridSqlColumn,
} from "@/lib/db/grid-sql";
import {
  clampCapacity,
  clampRating,
  clampTrips,
  dateToIsoString,
  formatDriverNo,
  isFuelType,
  normalizeDateInput,
  type DriverStatusValue,
} from "@/lib/driver-utils";
import { toIso } from "@/lib/lead-utils";

/** Allowlisted column ids for AG Grid sort / column filters on drivers. */
export const DRIVER_GRID_SQL_COLUMNS: Record<string, GridSqlColumn> = {
  name: { expr: "d.name", kind: "text" },
  phone: { expr: "d.phone", kind: "text" },
  address: { expr: "d.address", kind: "text" },
  status: { expr: "d.status", kind: "text" },
  rating: { expr: "d.rating", kind: "number" },
  trips: { expr: "d.trips", kind: "number" },
  vehicle: { expr: "v.registration_number", kind: "text" },
  vehicle_type: { expr: "v.vehicle_type", kind: "text" },
  license_expiry: { expr: "d.license_expiry", kind: "date" },
  insurance_expiry: { expr: "v.insurance_expiry", kind: "date" },
  pollution_expiry: { expr: "v.pollution_expiry", kind: "date" },
  driver_no: { expr: "d.driver_no", kind: "number" },
  updated: { expr: "d.updated_at", kind: "timestamptz" },
};

export const DRIVER_GRID_SORT_COLUMNS = Object.keys(DRIVER_GRID_SQL_COLUMNS);

export const DRIVER_GRID_FILTER_ALLOWLIST = Object.fromEntries(
  Object.entries(DRIVER_GRID_SQL_COLUMNS).map(([id, col]) => [
    id,
    col.kind === "timestamptz" || col.kind === "date"
      ? ("date" as const)
      : col.kind === "number"
        ? ("number" as const)
        : ("text" as const),
  ])
);

export type DriverJoinedRow = {
  id: string;
  driver_no: number;
  name: string;
  phone: string;
  address: string;
  license_number: string;
  license_expiry: unknown;
  status: string;
  rating: string | number;
  trips: number;
  vendor: boolean;
  documents_verified: boolean;
  notes: string;
  created_at: unknown;
  updated_at: unknown;
  vehicle_id: string | null;
  registration_number: string | null;
  vehicle_type: string | null;
  capacity: number | null;
  fuel_type: string | null;
  rc_number: string | null;
  insurance_expiry: unknown;
  pollution_expiry: unknown;
};

export type DriverDto = {
  id: string;
  driver_no: string;
  name: string;
  phone: string;
  address: string;
  license_number: string;
  license_expiry: string;
  status: DriverStatusValue;
  rating: number;
  trips: number;
  vendor: boolean;
  documents_verified: boolean;
  notes: string;
  vehicle: string;
  vehicle_type: string;
  vehicle_capacity: number;
  fuel_type: string;
  rc_number: string;
  insurance_expiry: string;
  pollution_expiry: string;
  created_at: string;
  updated_at: string;
};

export type CreateDriverInput = {
  name: string;
  phone: string;
  address?: string;
  license_number?: string;
  license_expiry?: string | null;
  status?: DriverStatusValue;
  rating?: number;
  trips?: number;
  vendor?: boolean;
  documents_verified?: boolean;
  notes?: string;
  vehicle: string;
  vehicle_type: string;
  vehicle_capacity?: number;
  fuel_type?: string;
  rc_number?: string;
  insurance_expiry?: string | null;
  pollution_expiry?: string | null;
};

export type PatchDriverInput = {
  name?: string;
  phone?: string;
  address?: string;
  license_number?: string;
  license_expiry?: string | null;
  status?: DriverStatusValue;
  rating?: number;
  trips?: number;
  vendor?: boolean;
  documents_verified?: boolean;
  notes?: string;
  vehicle?: string;
  vehicle_type?: string;
  vehicle_capacity?: number;
  fuel_type?: string;
  rc_number?: string;
  insurance_expiry?: string | null;
  pollution_expiry?: string | null;
};

export type ListDriversFilters = {
  search?: string;
  status?: string[];
  /** AG Grid column sort (allowlisted). */
  sortBy?: string | null;
  sortDir?: "asc" | "desc" | null;
  /** AG Grid Community column filters (allowlisted). */
  colFilters?: GridColumnFilter[];
};

export type ListDriversPageResult = {
  rows: DriverJoinedRow[];
  total: number;
};

export type DriverSummary = {
  approved: number;
  rejected: number;
  deactivated: number;
  docs_pending: number;
  total: number;
};

const DRIVER_SELECT = `
  SELECT
    d.id,
    d.driver_no,
    d.name,
    d.phone,
    d.address,
    d.license_number,
    d.license_expiry,
    d.status,
    d.rating,
    d.trips,
    d.vendor,
    d.documents_verified,
    d.notes,
    d.created_at,
    d.updated_at,
    v.id AS vehicle_id,
    v.registration_number,
    v.vehicle_type,
    v.capacity,
    v.fuel_type,
    v.rc_number,
    v.insurance_expiry,
    v.pollution_expiry
  FROM drivers d
  LEFT JOIN vehicles v ON v.driver_id = d.id
`;

function normalizeFuelType(value: unknown): string {
  if (value == null || value === "") return "";
  if (isFuelType(value)) return value;
  throw new Error("FUEL_TYPE_INVALID");
}

function patchTouchesVehicle(patch: PatchDriverInput): boolean {
  return (
    patch.vehicle !== undefined ||
    patch.vehicle_type !== undefined ||
    patch.vehicle_capacity !== undefined ||
    patch.fuel_type !== undefined ||
    patch.rc_number !== undefined ||
    patch.insurance_expiry !== undefined ||
    patch.pollution_expiry !== undefined
  );
}

export function driverToDto(row: DriverJoinedRow): DriverDto {
  return {
    id: row.id,
    driver_no: formatDriverNo(row.driver_no),
    name: row.name,
    phone: row.phone,
    address: row.address ?? "",
    license_number: row.license_number ?? "",
    license_expiry: dateToIsoString(row.license_expiry),
    status: row.status as DriverStatusValue,
    rating: Number(row.rating) || 0,
    trips: Number(row.trips) || 0,
    vendor: Boolean(row.vendor),
    documents_verified: Boolean(row.documents_verified),
    notes: row.notes ?? "",
    vehicle: row.registration_number ?? "",
    vehicle_type: row.vehicle_type ?? "",
    vehicle_capacity: Number(row.capacity) || 0,
    fuel_type: row.fuel_type ?? "",
    rc_number: row.rc_number ?? "",
    insurance_expiry: dateToIsoString(row.insurance_expiry),
    pollution_expiry: dateToIsoString(row.pollution_expiry),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export async function findDriverById(id: string): Promise<DriverJoinedRow | null> {
  const { rows } = await query<DriverJoinedRow>(`${DRIVER_SELECT} WHERE d.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Case-insensitive exact name match (trim). Used to resolve assignment → phone. */
export async function findDriverByName(name: string): Promise<DriverJoinedRow | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { rows } = await query<DriverJoinedRow>(
    `${DRIVER_SELECT} WHERE lower(d.name) = lower($1) ORDER BY d.updated_at DESC LIMIT 1`,
    [trimmed]
  );
  return rows[0] ?? null;
}

function buildDriversFilterClauses(filters: ListDriversFilters): {
  clauses: string[];
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(d.name) LIKE $${params.length}
        OR lower(d.phone) LIKE $${params.length}
        OR lower(d.address) LIKE $${params.length}
        OR lower(coalesce(v.registration_number, '')) LIKE $${params.length}
        OR lower(coalesce(v.vehicle_type, '')) LIKE $${params.length}
        OR lower('dr-' || lpad(d.driver_no::text, 3, '0')) LIKE $${params.length})`
    );
  }
  if (filters.status?.length) {
    params.push(filters.status);
    clauses.push(`d.status = ANY($${params.length}::text[])`);
  }
  if (filters.colFilters?.length) {
    appendGridColumnFilterClauses(filters.colFilters, DRIVER_GRID_SQL_COLUMNS, clauses, params);
  }

  return { clauses, params };
}

function driversOrderBy(filters: ListDriversFilters): string {
  return buildGridOrderBy(
    filters.sortBy && filters.sortDir
      ? { sortBy: filters.sortBy, sortDir: filters.sortDir }
      : null,
    DRIVER_GRID_SQL_COLUMNS,
    "d.updated_at DESC, d.driver_no DESC"
  );
}

export async function listDrivers(filters: ListDriversFilters = {}): Promise<DriverJoinedRow[]> {
  const { clauses, params } = buildDriversFilterClauses(filters);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<DriverJoinedRow>(
    `${DRIVER_SELECT} ${where} ORDER BY ${driversOrderBy(filters)}`,
    params
  );
  return rows;
}

export async function listDriversPage(
  filters: ListDriversFilters = {},
  options: { limit: number; offset: number }
): Promise<ListDriversPageResult> {
  const limit = Math.min(Math.max(Math.floor(options.limit) || 25, 1), 100);
  const offset = Math.max(Math.floor(options.offset) || 0, 0);
  const { clauses, params } = buildDriversFilterClauses(filters);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const fromSql = `FROM drivers d LEFT JOIN vehicles v ON v.driver_id = d.id`;

  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total ${fromSql} ${where}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  if (total === 0 || offset >= total) {
    return { rows: [], total };
  }

  const { rows } = await query<DriverJoinedRow>(
    `${DRIVER_SELECT} ${where}
     ORDER BY ${driversOrderBy(filters)}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { rows, total };
}

export async function getDriverSummary(): Promise<DriverSummary> {
  const { rows } = await query<{
    approved: string | number;
    rejected: string | number;
    deactivated: string | number;
    docs_pending: string | number;
    total: string | number;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'Approved') AS approved,
       COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected,
       COUNT(*) FILTER (WHERE status = 'Deactivated') AS deactivated,
       COUNT(*) FILTER (WHERE documents_verified = false) AS docs_pending,
       COUNT(*) AS total
     FROM drivers`
  );
  const row = rows[0];
  return {
    approved: Number(row?.approved) || 0,
    rejected: Number(row?.rejected) || 0,
    deactivated: Number(row?.deactivated) || 0,
    docs_pending: Number(row?.docs_pending) || 0,
    total: Number(row?.total) || 0,
  };
}

/** Create driver + vehicle and return joined row in one round-trip. */
export async function createDriver(input: CreateDriverInput): Promise<DriverJoinedRow> {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const vehicle = input.vehicle.trim();
  const vehicleType = input.vehicle_type.trim();
  if (!name) throw new Error("NAME_REQUIRED");
  if (!phone) throw new Error("PHONE_REQUIRED");
  if (!vehicle) throw new Error("VEHICLE_REQUIRED");
  if (!vehicleType) throw new Error("VEHICLE_TYPE_REQUIRED");

  const fuelType = normalizeFuelType(input.fuel_type ?? "Diesel");
  const status = input.status ?? "Approved";

  const { rows } = await query<DriverJoinedRow>(
    `WITH inserted_driver AS (
       INSERT INTO drivers (
         name, phone, address, license_number, license_expiry,
         status, rating, trips, vendor, documents_verified, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *
     ),
     inserted_vehicle AS (
       INSERT INTO vehicles (
         driver_id, registration_number, vehicle_type, capacity, fuel_type,
         rc_number, insurance_expiry, pollution_expiry
       )
       SELECT
         id, $12, $13, $14, $15, $16, $17, $18
       FROM inserted_driver
       RETURNING *
     )
     SELECT
       d.id,
       d.driver_no,
       d.name,
       d.phone,
       d.address,
       d.license_number,
       d.license_expiry,
       d.status,
       d.rating,
       d.trips,
       d.vendor,
       d.documents_verified,
       d.notes,
       d.created_at,
       d.updated_at,
       v.id AS vehicle_id,
       v.registration_number,
       v.vehicle_type,
       v.capacity,
       v.fuel_type,
       v.rc_number,
       v.insurance_expiry,
       v.pollution_expiry
     FROM inserted_driver d
     LEFT JOIN inserted_vehicle v ON v.driver_id = d.id`,
    [
      name,
      phone,
      input.address?.trim() ?? "",
      input.license_number?.trim() ?? "",
      normalizeDateInput(input.license_expiry),
      status,
      clampRating(input.rating ?? 5),
      clampTrips(input.trips ?? 0),
      Boolean(input.vendor),
      Boolean(input.documents_verified),
      input.notes?.trim() ?? "",
      vehicle,
      vehicleType,
      clampCapacity(input.vehicle_capacity ?? 0),
      fuelType,
      input.rc_number?.trim() ?? "",
      normalizeDateInput(input.insurance_expiry),
      normalizeDateInput(input.pollution_expiry),
    ]
  );

  const row = rows[0];
  if (!row) throw new Error("Failed to load created driver");
  return row;
}

/**
 * Patch driver (and vehicle only when vehicle fields are present).
 * Uses a single SQL round-trip to avoid remote DB latency stacking.
 */
export async function patchDriver(id: string, patch: PatchDriverInput): Promise<DriverJoinedRow> {
  if (patch.name !== undefined && !patch.name.trim()) throw new Error("NAME_REQUIRED");
  if (patch.phone !== undefined && !patch.phone.trim()) throw new Error("PHONE_REQUIRED");
  if (patch.vehicle !== undefined && !patch.vehicle.trim()) throw new Error("VEHICLE_REQUIRED");
  if (patch.vehicle_type !== undefined && !patch.vehicle_type.trim()) {
    throw new Error("VEHICLE_TYPE_REQUIRED");
  }
  if (patch.fuel_type !== undefined) normalizeFuelType(patch.fuel_type);

  const touchesVehicle = patchTouchesVehicle(patch);

  if (!touchesVehicle) {
    // Fast path: driver columns only (status toggle, notes, etc.)
    const { rows } = await query<DriverJoinedRow>(
      `WITH updated AS (
         UPDATE drivers SET
           name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           license_number = COALESCE($5, license_number),
           license_expiry = CASE WHEN $6::boolean THEN $7::date ELSE license_expiry END,
           status = COALESCE($8, status),
           rating = COALESCE($9, rating),
           trips = COALESCE($10, trips),
           vendor = COALESCE($11, vendor),
           documents_verified = COALESCE($12, documents_verified),
           notes = COALESCE($13, notes),
           updated_at = now()
         WHERE id = $1
         RETURNING *
       )
       SELECT
         d.id, d.driver_no, d.name, d.phone, d.address, d.license_number, d.license_expiry,
         d.status, d.rating, d.trips, d.vendor, d.documents_verified, d.notes,
         d.created_at, d.updated_at,
         v.id AS vehicle_id, v.registration_number, v.vehicle_type, v.capacity, v.fuel_type,
         v.rc_number, v.insurance_expiry, v.pollution_expiry
       FROM updated d
       LEFT JOIN vehicles v ON v.driver_id = d.id`,
      [
        id,
        patch.name !== undefined ? patch.name.trim() : null,
        patch.phone !== undefined ? patch.phone.trim() : null,
        patch.address !== undefined ? patch.address.trim() : null,
        patch.license_number !== undefined ? patch.license_number.trim() : null,
        patch.license_expiry !== undefined,
        patch.license_expiry !== undefined ? normalizeDateInput(patch.license_expiry) : null,
        patch.status ?? null,
        patch.rating !== undefined ? clampRating(patch.rating) : null,
        patch.trips !== undefined ? clampTrips(patch.trips) : null,
        patch.vendor !== undefined ? Boolean(patch.vendor) : null,
        patch.documents_verified !== undefined ? Boolean(patch.documents_verified) : null,
        patch.notes !== undefined ? patch.notes.trim() : null,
      ]
    );
    const row = rows[0];
    if (!row) throw new Error("NOT_FOUND");
    return row;
  }

  // Full path: update driver + upsert vehicle in one statement
  const existing = await findDriverById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const name = patch.name !== undefined ? patch.name.trim() : existing.name;
  const phone = patch.phone !== undefined ? patch.phone.trim() : existing.phone;
  const registration =
    patch.vehicle !== undefined
      ? patch.vehicle.trim()
      : existing.registration_number?.trim() ?? "";
  const vehicleType =
    patch.vehicle_type !== undefined
      ? patch.vehicle_type.trim()
      : existing.vehicle_type?.trim() ?? "";
  if (!registration) throw new Error("VEHICLE_REQUIRED");
  if (!vehicleType) throw new Error("VEHICLE_TYPE_REQUIRED");

  const fuelType =
    patch.fuel_type !== undefined
      ? normalizeFuelType(patch.fuel_type)
      : normalizeFuelType(existing.fuel_type ?? "");

  const { rows } = await query<DriverJoinedRow>(
    `WITH updated_driver AS (
       UPDATE drivers SET
         name = $2,
         phone = $3,
         address = $4,
         license_number = $5,
         license_expiry = $6,
         status = $7,
         rating = $8,
         trips = $9,
         vendor = $10,
         documents_verified = $11,
         notes = $12,
         updated_at = now()
       WHERE id = $1
       RETURNING *
     ),
     upserted_vehicle AS (
       INSERT INTO vehicles (
         driver_id, registration_number, vehicle_type, capacity, fuel_type,
         rc_number, insurance_expiry, pollution_expiry
       )
       SELECT
         id, $13, $14, $15, $16, $17, $18, $19
       FROM updated_driver
       ON CONFLICT (driver_id) DO UPDATE SET
         registration_number = EXCLUDED.registration_number,
         vehicle_type = EXCLUDED.vehicle_type,
         capacity = EXCLUDED.capacity,
         fuel_type = EXCLUDED.fuel_type,
         rc_number = EXCLUDED.rc_number,
         insurance_expiry = EXCLUDED.insurance_expiry,
         pollution_expiry = EXCLUDED.pollution_expiry,
         updated_at = now()
       RETURNING *
     )
     SELECT
       d.id, d.driver_no, d.name, d.phone, d.address, d.license_number, d.license_expiry,
       d.status, d.rating, d.trips, d.vendor, d.documents_verified, d.notes,
       d.created_at, d.updated_at,
       v.id AS vehicle_id, v.registration_number, v.vehicle_type, v.capacity, v.fuel_type,
       v.rc_number, v.insurance_expiry, v.pollution_expiry
     FROM updated_driver d
     LEFT JOIN upserted_vehicle v ON v.driver_id = d.id`,
    [
      id,
      name,
      phone,
      patch.address !== undefined ? patch.address.trim() : existing.address,
      patch.license_number !== undefined ? patch.license_number.trim() : existing.license_number,
      patch.license_expiry !== undefined
        ? normalizeDateInput(patch.license_expiry)
        : normalizeDateInput(dateToIsoString(existing.license_expiry)),
      patch.status !== undefined ? patch.status : existing.status,
      patch.rating !== undefined ? clampRating(patch.rating) : Number(existing.rating) || 5,
      patch.trips !== undefined ? clampTrips(patch.trips) : Number(existing.trips) || 0,
      patch.vendor !== undefined ? Boolean(patch.vendor) : Boolean(existing.vendor),
      patch.documents_verified !== undefined
        ? Boolean(patch.documents_verified)
        : Boolean(existing.documents_verified),
      patch.notes !== undefined ? patch.notes.trim() : existing.notes,
      registration,
      vehicleType,
      patch.vehicle_capacity !== undefined
        ? clampCapacity(patch.vehicle_capacity)
        : Number(existing.capacity) || 0,
      fuelType,
      patch.rc_number !== undefined ? patch.rc_number.trim() : existing.rc_number ?? "",
      patch.insurance_expiry !== undefined
        ? normalizeDateInput(patch.insurance_expiry)
        : normalizeDateInput(dateToIsoString(existing.insurance_expiry)),
      patch.pollution_expiry !== undefined
        ? normalizeDateInput(patch.pollution_expiry)
        : normalizeDateInput(dateToIsoString(existing.pollution_expiry)),
    ]
  );

  const row = rows[0];
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function deleteDriver(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM drivers WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export type VehicleOption = {
  id: string;
  vehicle_type: string;
  registration_number: string;
  capacity: number;
  driver_name: string;
  driver_status: string;
};

export async function listApprovedVehicles(): Promise<VehicleOption[]> {
  const { rows } = await query<VehicleOption>(
    `SELECT
       v.id,
       v.vehicle_type,
       v.registration_number,
       v.capacity,
       d.name AS driver_name,
       d.status AS driver_status
     FROM vehicles v
     JOIN drivers d ON d.id = v.driver_id
     WHERE d.status = 'Approved'
     ORDER BY v.vehicle_type ASC, v.registration_number ASC`
  );
  return rows.map((row) => ({
    ...row,
    capacity: Number(row.capacity) || 0,
  }));
}

export async function resolveVehicleOption(
  id: string,
  opts?: { requireApproved?: boolean }
): Promise<VehicleOption | null> {
  const requireApproved = opts?.requireApproved ?? true;
  const { rows } = await query<VehicleOption>(
    `SELECT
       v.id,
       v.vehicle_type,
       v.registration_number,
       v.capacity,
       d.name AS driver_name,
       d.status AS driver_status
     FROM vehicles v
     JOIN drivers d ON d.id = v.driver_id
     WHERE v.id = $1::uuid
       ${requireApproved ? "AND d.status = 'Approved'" : ""}
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return { ...row, capacity: Number(row.capacity) || 0 };
}

export function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
