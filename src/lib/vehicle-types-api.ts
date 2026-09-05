export type VehicleTypeApi = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export async function fetchVehicleTypes(opts?: {
  activeOnly?: boolean;
}): Promise<VehicleTypeApi[]> {
  const qs = opts?.activeOnly ? "?active=1" : "";
  const res = await fetch(`/api/vehicle-types${qs}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to load vehicle types");
  }
  const data = (await res.json()) as { vehicle_types: VehicleTypeApi[] };
  return data.vehicle_types ?? [];
}

export async function createVehicleTypeApi(input: {
  name: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<VehicleTypeApi> {
  const res = await fetch("/api/vehicle-types", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to create vehicle type");
  }
  const data = (await res.json()) as { vehicle_type: VehicleTypeApi };
  return data.vehicle_type;
}

export async function updateVehicleTypeApi(
  id: string,
  input: { name?: string; sort_order?: number; is_active?: boolean }
): Promise<VehicleTypeApi> {
  const res = await fetch(`/api/vehicle-types/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update vehicle type");
  }
  const data = (await res.json()) as { vehicle_type: VehicleTypeApi };
  return data.vehicle_type;
}

export async function deleteVehicleTypeApi(id: string): Promise<void> {
  const res = await fetch(`/api/vehicle-types/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to delete vehicle type");
  }
}
