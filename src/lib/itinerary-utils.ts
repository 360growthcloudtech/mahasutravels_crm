import type { ItineraryDay, ItineraryStatus } from "@/lib/data";

export const ITINERARY_STATUSES = ["Active", "Draft", "Archived"] as const;

export type ItineraryStatusValue = (typeof ITINERARY_STATUSES)[number];

export function formatItineraryNo(n: number) {
  return `IT-${n}`;
}

export function isItineraryStatus(value: unknown): value is ItineraryStatusValue {
  return typeof value === "string" && (ITINERARY_STATUSES as readonly string[]).includes(value);
}

export function clampDiscountPercentage(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 100);
}

export function clampVarchar(value: unknown, max = 255): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

/** Lowercase kebab slug; empty input → empty string. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 255);
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 255;
}

export function normalizeDaysPlan(input: unknown): ItineraryDay[] {
  if (!Array.isArray(input)) return [];
  const days: ItineraryDay[] = [];
  for (let i = 0; i < input.length; i++) {
    const raw = input[i];
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const hotelId =
      typeof row.hotelId === "string" && row.hotelId.trim()
        ? row.hotelId.trim()
        : typeof row.hotel_id === "string" && row.hotel_id.trim()
          ? row.hotel_id.trim()
          : undefined;
    const hotelName =
      typeof row.hotelName === "string"
        ? row.hotelName.trim()
        : typeof row.hotel_name === "string"
          ? row.hotel_name.trim()
          : "";
    days.push({
      day: i + 1,
      title,
      detail: typeof row.detail === "string" ? row.detail.trim() : "",
      ...(hotelId ? { hotelId } : {}),
      ...(hotelName ? { hotelName } : {}),
    });
  }
  return days;
}

export function suggestDurationFromPlan(daysPlan: ItineraryDay[]): { nights: string; days: string } {
  const days = Math.max(daysPlan.length, 1);
  return { days: String(days), nights: String(Math.max(days - 1, 0)) };
}

export function parseInclusions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // fall through
    }
  }
  return [];
}

export type { ItineraryStatus };
