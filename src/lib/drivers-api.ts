import type { Driver } from "@/lib/data";

export type DriverApi = {
  id: string;
  driver_no: string;
  name: string;
  phone: string;
  address: string;
  license_number: string;
  license_expiry: string;
  status: Driver["status"];
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

export type DriverSummaryApi = {
  approved: number;
  rejected: number;
  deactivated: number;
  docs_pending: number;
  total: number;
};

export type DriverWritePayload = {
  name: string;
  phone: string;
  address?: string;
  license_number?: string;
  license_expiry?: string | null;
  status?: Driver["status"];
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

export function driverFromApi(dto: DriverApi): Driver {
  const fuel = dto.fuel_type;
  return {
    id: dto.id,
    driverNo: dto.driver_no,
    name: dto.name,
    phone: dto.phone,
    address: dto.address ?? "",
    vehicle: dto.vehicle ?? "",
    vehicleType: dto.vehicle_type ?? "",
    vehicleCapacity: dto.vehicle_capacity ?? 0,
    fuelType:
      fuel === "Petrol" || fuel === "Diesel" || fuel === "CNG" || fuel === "Electric"
        ? fuel
        : undefined,
    licenseNumber: dto.license_number ?? "",
    licenseExpiry: dto.license_expiry ?? "",
    rcNumber: dto.rc_number ?? "",
    insuranceExpiry: dto.insurance_expiry ?? "",
    pollutionExpiry: dto.pollution_expiry ?? "",
    status: dto.status,
    rating: dto.rating ?? 0,
    trips: dto.trips ?? 0,
    vendor: Boolean(dto.vendor),
    documentsVerified: Boolean(dto.documents_verified),
    notes: dto.notes ?? "",
  };
}

export function driverToWritePayload(
  input: Omit<Driver, "id" | "driverNo"> | {
    name: string;
    phone: string;
    address?: string;
    vehicle: string;
    vehicleType: string;
    vehicleCapacity?: number;
    fuelType?: Driver["fuelType"];
    licenseNumber?: string;
    licenseExpiry?: string;
    rcNumber?: string;
    insuranceExpiry?: string;
    pollutionExpiry?: string;
    status?: Driver["status"];
    rating?: number;
    trips?: number;
    vendor?: boolean;
    documentsVerified?: boolean;
    notes?: string;
  }
): DriverWritePayload {
  return {
    name: input.name,
    phone: input.phone,
    address: input.address ?? "",
    license_number: input.licenseNumber ?? "",
    license_expiry: input.licenseExpiry || null,
    status: input.status,
    rating: input.rating,
    trips: input.trips,
    vendor: input.vendor ?? false,
    documents_verified: input.documentsVerified ?? false,
    notes: input.notes ?? "",
    vehicle: input.vehicle,
    vehicle_type: input.vehicleType,
    vehicle_capacity: input.vehicleCapacity ?? 0,
    fuel_type: input.fuelType ?? "",
    rc_number: input.rcNumber ?? "",
    insurance_expiry: input.insuranceExpiry || null,
    pollution_expiry: input.pollutionExpiry || null,
  };
}

export async function fetchDrivers(): Promise<{
  drivers: DriverApi[];
  summary?: DriverSummaryApi;
}> {
  const res = await fetch("/api/drivers", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load drivers");
  const data = (await res.json()) as {
    drivers?: DriverApi[];
    summary?: DriverSummaryApi;
  };
  return { drivers: data.drivers ?? [], summary: data.summary };
}

export async function createDriverApi(payload: DriverWritePayload): Promise<DriverApi> {
  const res = await fetch("/api/drivers", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to create driver");
  }
  const data = (await res.json()) as { driver: DriverApi };
  return data.driver;
}

export async function updateDriverApi(
  id: string,
  payload: Partial<DriverWritePayload>
): Promise<DriverApi> {
  const res = await fetch(`/api/drivers/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update driver");
  }
  const data = (await res.json()) as { driver: DriverApi };
  return data.driver;
}

export async function deleteDriverApi(id: string): Promise<void> {
  const res = await fetch(`/api/drivers/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to delete driver");
  }
}
