export function formatDriverNo(n: number) {
  return `DR-${String(n).padStart(3, "0")}`;
}

export const DRIVER_STATUSES = ["Approved", "Rejected", "Deactivated"] as const;
export type DriverStatusValue = (typeof DRIVER_STATUSES)[number];

export const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric"] as const;
export type FuelTypeValue = (typeof FUEL_TYPES)[number];

export function isDriverStatus(value: unknown): value is DriverStatusValue {
  return typeof value === "string" && (DRIVER_STATUSES as readonly string[]).includes(value);
}

export function isFuelType(value: unknown): value is FuelTypeValue {
  return typeof value === "string" && (FUEL_TYPES as readonly string[]).includes(value);
}

/** Normalize optional date string to YYYY-MM-DD or null. */
export function normalizeDateInput(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function dateToIsoString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw;
}

export function clampRating(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(Math.max(n, 0), 5);
}

export function clampTrips(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(Math.floor(n), 0);
}

export function clampCapacity(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(Math.floor(n), 0);
}
