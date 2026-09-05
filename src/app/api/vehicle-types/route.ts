import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import {
  createVehicleType,
  listVehicleTypes,
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

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "drivers.and.vehicles.view");
  if (denied) return denied;

  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "1";
  const rows = await listVehicleTypes(activeOnly);
  return NextResponse.json({ vehicle_types: rows.map(vehicleTypeToDto) });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "drivers.and.vehicles.create");
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const sortOrder =
    typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
      ? Math.floor(body.sort_order)
      : undefined;
  const isActive = typeof body.is_active === "boolean" ? body.is_active : undefined;

  try {
    const row = await createVehicleType({ name, sort_order: sortOrder, is_active: isActive });
    return NextResponse.json({ vehicle_type: vehicleTypeToDto(row) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NAME_REQUIRED") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "A vehicle type with this name already exists" }, { status: 409 });
    }
    console.error("[vehicle-types POST]", error);
    return NextResponse.json({ error: "Failed to create vehicle type" }, { status: 500 });
  }
}
