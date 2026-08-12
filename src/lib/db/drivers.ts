import { getPool, query } from "@/lib/db";
import {
  clampCapacity,
  clampRating,
  clampTrips,
  dateToIsoString,
  formatDriverNo,
  isFuelType,
  normalizeDateInput,
  type DriverStatusValue,
  type FuelTypeValue,
} from "@/lib/driver-utils";
import { toIso } from "@/lib/lead-utils";

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

export async function listDrivers(filters: ListDriversFilters = {}): Promise<DriverJoinedRow[]> {
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

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<DriverJoinedRow>(
    `${DRIVER_SELECT} ${where} ORDER BY d.updated_at DESC, d.driver_no DESC`,
    params
  );
  return rows;
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

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO drivers (
        name, phone, address, license_number, license_expiry,
        status, rating, trips, vendor, documents_verified, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id`,
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
      ]
    );
    const id = inserted.rows[0].id;
    await client.query(
      `INSERT INTO vehicles (
        driver_id, registration_number, vehicle_type, capacity, fuel_type,
        rc_number, insurance_expiry, pollution_expiry
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        vehicle,
        vehicleType,
        clampCapacity(input.vehicle_capacity ?? 0),
        fuelType,
        input.rc_number?.trim() ?? "",
        normalizeDateInput(input.insurance_expiry),
        normalizeDateInput(input.pollution_expiry),
      ]
    );
    await client.query("COMMIT");

    const found = await findDriverById(id);
    if (!found) throw new Error("Failed to load created driver");
    return found;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function patchDriver(id: string, patch: PatchDriverInput): Promise<DriverJoinedRow> {
  const existing = await findDriverById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const name = patch.name !== undefined ? patch.name.trim() : existing.name;
  const phone = patch.phone !== undefined ? patch.phone.trim() : existing.phone;
  if (!name) throw new Error("NAME_REQUIRED");
  if (!phone) throw new Error("PHONE_REQUIRED");

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

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE drivers SET
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
       WHERE id = $1`,
      [
        id,
        name,
        phone,
        patch.address !== undefined ? patch.address.trim() : existing.address,
        patch.license_number !== undefined
          ? patch.license_number.trim()
          : existing.license_number,
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
      ]
    );

    await client.query(
      `INSERT INTO vehicles (
        driver_id, registration_number, vehicle_type, capacity, fuel_type,
        rc_number, insurance_expiry, pollution_expiry
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (driver_id) DO UPDATE SET
        registration_number = EXCLUDED.registration_number,
        vehicle_type = EXCLUDED.vehicle_type,
        capacity = EXCLUDED.capacity,
        fuel_type = EXCLUDED.fuel_type,
        rc_number = EXCLUDED.rc_number,
        insurance_expiry = EXCLUDED.insurance_expiry,
        pollution_expiry = EXCLUDED.pollution_expiry,
        updated_at = now()`,
      [
        id,
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

    await client.query("COMMIT");
    const found = await findDriverById(id);
    if (!found) throw new Error("NOT_FOUND");
    return found;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteDriver(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM drivers WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
