import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import {
  deleteVehicleType,
  patchVehicleType,
  vehicleTypeToDto,
} from "@/lib/db/vehicle-types";

export const runtime = "nodejs";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "drivers.and.vehicles.edit");
  if (denied) return denied;

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: { name?: string; sort_order?: number; is_active?: boolean } = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    patch.sort_order = Math.floor(body.sort_order);
  }
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  try {
    const row = await patchVehicleType(id, patch);
    return NextResponse.json({ vehicle_type: vehicleTypeToDto(row) });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Vehicle type not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "NAME_REQUIRED") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "A vehicle type with this name already exists" }, { status: 409 });
    }
    console.error("[vehicle-types PATCH]", error);
    return NextResponse.json({ error: "Failed to update vehicle type" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "drivers.and.vehicles.delete");
  if (denied) return denied;

  const { id } = await context.params;
  try {
    await deleteVehicleType(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Vehicle type not found" }, { status: 404 });
    }
    console.error("[vehicle-types DELETE]", error);
    return NextResponse.json({ error: "Failed to delete vehicle type" }, { status: 500 });
  }
}
