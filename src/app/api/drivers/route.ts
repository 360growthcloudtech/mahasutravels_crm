import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  createDriver,
  driverToDto,
  isUniqueViolation,
  listDrivers,
  type CreateDriverInput,
} from "@/lib/db/drivers";
import { isDriverStatus, isFuelType, normalizeDateInput } from "@/lib/driver-utils";

export const runtime = "nodejs";

function csvParam(value: string | null): string[] | undefined {
  if (!value?.trim()) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

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

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const drivers = await listDrivers({
    search: url.searchParams.get("search") ?? undefined,
    status: csvParam(url.searchParams.get("status")),
  });

  return NextResponse.json({
    drivers: drivers.map(driverToDto),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = readString(body.name)?.trim() ?? "";
  const phone = readString(body.phone)?.trim() ?? "";
  const vehicle = readString(body.vehicle)?.trim() ?? "";
  const vehicleType = readString(body.vehicle_type)?.trim() ?? "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });
  if (!vehicle) {
    return NextResponse.json({ error: "vehicle registration is required" }, { status: 400 });
  }
  if (!vehicleType) {
    return NextResponse.json({ error: "vehicle_type is required" }, { status: 400 });
  }

  const statusRaw = readString(body.status);
  if (statusRaw !== undefined && !isDriverStatus(statusRaw)) {
    return NextResponse.json({ error: "status is invalid" }, { status: 400 });
  }

  const fuelRaw = readString(body.fuel_type);
  if (fuelRaw !== undefined && fuelRaw !== "" && !isFuelType(fuelRaw)) {
    return NextResponse.json({ error: "fuel_type is invalid" }, { status: 400 });
  }

  const input: CreateDriverInput = {
    name,
    phone,
    address: readString(body.address)?.trim() ?? "",
    license_number: readString(body.license_number)?.trim() ?? "",
    license_expiry: normalizeDateInput(body.license_expiry),
    status: statusRaw && isDriverStatus(statusRaw) ? statusRaw : "Approved",
    rating: readNumber(body.rating),
    trips: readNumber(body.trips),
    vendor: readBoolean(body.vendor) ?? false,
    documents_verified: readBoolean(body.documents_verified) ?? false,
    notes: readString(body.notes)?.trim() ?? "",
    vehicle,
    vehicle_type: vehicleType,
    vehicle_capacity: readNumber(body.vehicle_capacity) ?? 0,
    fuel_type: fuelRaw ?? "Diesel",
    rc_number: readString(body.rc_number)?.trim() ?? "",
    insurance_expiry: normalizeDateInput(body.insurance_expiry),
    pollution_expiry: normalizeDateInput(body.pollution_expiry),
  };

  try {
    const created = await createDriver(input);
    return NextResponse.json({ driver: driverToDto(created) }, { status: 201 });
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
