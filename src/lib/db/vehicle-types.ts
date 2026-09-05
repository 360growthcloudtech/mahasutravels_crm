import { query } from "@/lib/db";

export type VehicleTypeRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: unknown;
  updated_at: unknown;
};

export type VehicleTypeDto = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export function vehicleTypeToDto(row: VehicleTypeRow): VehicleTypeDto {
  return {
    id: row.id,
    name: row.name,
    sort_order: Number(row.sort_order) || 0,
    is_active: !!row.is_active,
  };
}

export async function listVehicleTypes(activeOnly = false): Promise<VehicleTypeRow[]> {
  const { rows } = await query<VehicleTypeRow>(
    `SELECT id, name, sort_order, is_active, created_at, updated_at
     FROM vehicle_types
     ${activeOnly ? "WHERE is_active = true" : ""}
     ORDER BY sort_order ASC, lower(name) ASC`
  );
  return rows;
}

export async function findVehicleTypeById(id: string): Promise<VehicleTypeRow | null> {
  const { rows } = await query<VehicleTypeRow>(
    `SELECT id, name, sort_order, is_active, created_at, updated_at
     FROM vehicle_types WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createVehicleType(input: {
  name: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<VehicleTypeRow> {
  const name = input.name.trim();
  if (!name) throw new Error("NAME_REQUIRED");

  const { rows } = await query<VehicleTypeRow>(
    `INSERT INTO vehicle_types (name, sort_order, is_active)
     VALUES ($1, $2, $3)
     RETURNING id, name, sort_order, is_active, created_at, updated_at`,
    [name, input.sort_order ?? 0, input.is_active ?? true]
  );
  return rows[0];
}

export async function patchVehicleType(
  id: string,
  patch: { name?: string; sort_order?: number; is_active?: boolean }
): Promise<VehicleTypeRow> {
  const existing = await findVehicleTypeById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const name = patch.name !== undefined ? patch.name.trim() : existing.name;
  if (!name) throw new Error("NAME_REQUIRED");
  const sortOrder = patch.sort_order !== undefined ? patch.sort_order : existing.sort_order;
  const isActive = patch.is_active !== undefined ? patch.is_active : existing.is_active;

  const { rows } = await query<VehicleTypeRow>(
    `UPDATE vehicle_types
     SET name = $2,
         sort_order = $3,
         is_active = $4,
         updated_at = now()
     WHERE id = $1
     RETURNING id, name, sort_order, is_active, created_at, updated_at`,
    [id, name, sortOrder, isActive]
  );
  return rows[0];
}

export async function deleteVehicleType(id: string): Promise<void> {
  const { rowCount } = await query(`DELETE FROM vehicle_types WHERE id = $1`, [id]);
  if (!rowCount) throw new Error("NOT_FOUND");
}
