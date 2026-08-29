export function formatDriverNo(n: number) {
  return `DR-${String(n).padStart(3, "0")}`;
}

export const DRIVER_STATUSES = ["Approved", "Rejected", "Deactivated"] as const;
export type DriverStatusValue = (typeof DRIVER_STATUSES)[number];

/** User-facing label: Approved → Active; Rejected/Deactivated → Inactive. */
export function formatDriverStatusLabel(status: DriverStatusValue | string): string {
  if (status === "Approved") return "Active";
  if (status === "Rejected" || status === "Deactivated") return "Inactive";
  return status;
}

export function isDriverActiveStatus(status: DriverStatusValue | string): boolean {
  return status === "Approved";
}

export const DRIVER_STATUS_FILTER_GROUPS = [
  { label: "Active", statuses: ["Approved"] as const },
  { label: "Inactive", statuses: ["Rejected", "Deactivated"] as const },
] as const;

export const DRIVER_FORM_STATUS_OPTIONS = [
  { label: "Active", value: "Approved" as const },
  { label: "Inactive", value: "Deactivated" as const },
] as const;

/** Map stored status to form select value (Inactive covers Rejected and Deactivated). */
export function driverFormStatusValue(status: DriverStatusValue): DriverStatusValue {
  return status === "Approved" ? "Approved" : "Deactivated";
}

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

export function formatSeatCount(capacity?: number) {
  const n = clampCapacity(capacity);
  if (n <= 0) return "";
  return `${n} seater`;
}

/** Driver dropdown: "Name · Car · 7 seater" */
export function formatDriverFleetLabel(d: {
  name: string;
  vehicleType?: string;
  vehicleCapacity?: number;
}) {
  const parts = [d.name.trim()].filter(Boolean);
  const car = d.vehicleType?.trim();
  if (car) parts.push(car);
  const seats = formatSeatCount(d.vehicleCapacity);
  if (seats) parts.push(seats);
  return parts.join(" · ");
}
