import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  deleteDriver,
  driverToDto,
  findDriverById,
  isUniqueViolation,
  patchDriver,
  type PatchDriverInput,
} from "@/lib/db/drivers";
import { isDriverStatus, isFuelType, normalizeDateInput } from "@/lib/driver-utils";

export const runtime = "nodejs";

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "NOT_FOUND":
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    case "NAME_REQUIRED":
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    case "PHONE_REQUIRED":
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    case "VEHICLE_REQUIRED":
      return NextResponse.json({ error: "vehicle registration is required" }, { status: 400 });
    case "VEHICLE_TYPE_REQUIRED":
      return NextResponse.json({ error: "vehicle_type is required" }, { status: 400 });
    case "FUEL_TYPE_INVALID":
      return NextResponse.json({ error: "fuel_type is invalid" }, { status: 400 });
    default:
      return null;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const driver = await findDriverById(id);
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  return NextResponse.json({ driver: driverToDto(driver) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: PatchDriverInput = {};
  if (body.name !== undefined) {
    const name = readString(body.name)?.trim() ?? "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    patch.name = name;
  }
  if (body.phone !== undefined) {
    const phone = readString(body.phone)?.trim() ?? "";
    if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });
    patch.phone = phone;
  }
  if (body.address !== undefined) patch.address = readString(body.address)?.trim() ?? "";
  if (body.license_number !== undefined) {
    patch.license_number = readString(body.license_number)?.trim() ?? "";
  }
  if (body.license_expiry !== undefined) {
    patch.license_expiry = normalizeDateInput(body.license_expiry);
  }
  if (body.status !== undefined) {
    const status = readString(body.status);
    if (!isDriverStatus(status)) {
      return NextResponse.json({ error: "status is invalid" }, { status: 400 });
    }
    patch.status = status;
  }
  if (body.rating !== undefined) patch.rating = readNumber(body.rating);
  if (body.trips !== undefined) patch.trips = readNumber(body.trips);
  if (body.vendor !== undefined) patch.vendor = readBoolean(body.vendor) ?? false;
  if (body.documents_verified !== undefined) {
    patch.documents_verified = readBoolean(body.documents_verified) ?? false;
  }
  if (body.notes !== undefined) patch.notes = readString(body.notes)?.trim() ?? "";
  if (body.vehicle !== undefined) {
    const vehicle = readString(body.vehicle)?.trim() ?? "";
    if (!vehicle) {
      return NextResponse.json({ error: "vehicle registration is required" }, { status: 400 });
    }
    patch.vehicle = vehicle;
  }
  if (body.vehicle_type !== undefined) {
    const vehicleType = readString(body.vehicle_type)?.trim() ?? "";
    if (!vehicleType) {
      return NextResponse.json({ error: "vehicle_type is required" }, { status: 400 });
    }
    patch.vehicle_type = vehicleType;
  }
  if (body.vehicle_capacity !== undefined) {
    patch.vehicle_capacity = readNumber(body.vehicle_capacity) ?? 0;
  }
  if (body.fuel_type !== undefined) {
    const fuel = readString(body.fuel_type) ?? "";
    if (fuel !== "" && !isFuelType(fuel)) {
      return NextResponse.json({ error: "fuel_type is invalid" }, { status: 400 });
    }
    patch.fuel_type = fuel;
  }
  if (body.rc_number !== undefined) patch.rc_number = readString(body.rc_number)?.trim() ?? "";
  if (body.insurance_expiry !== undefined) {
    patch.insurance_expiry = normalizeDateInput(body.insurance_expiry);
  }
  if (body.pollution_expiry !== undefined) {
    patch.pollution_expiry = normalizeDateInput(body.pollution_expiry);
  }

  try {
    const updated = await patchDriver(id, patch);
    return NextResponse.json({ driver: driverToDto(updated) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "vehicle registration already exists" },
        { status: 409 }
      );
    }
    const mapped = mapError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const deleted = await deleteDriver(id);
  if (!deleted) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
