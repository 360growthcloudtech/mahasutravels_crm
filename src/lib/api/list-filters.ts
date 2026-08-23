import type { SessionPayload } from "@/lib/auth-jwt";
import type { ListLeadsFilters } from "@/lib/db/leads";
import type { ListBookingsFilters } from "@/lib/db/bookings";

function csvParam(value: string | null): string[] | undefined {
  if (!value?.trim()) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseLeadsListFilters(
  searchParams: URLSearchParams,
  session: SessionPayload
): ListLeadsFilters {
  const assignedTo =
    session.role === "Employee"
      ? [session.sub]
      : csvParam(searchParams.get("assigned_to"));

  return {
    search: searchParams.get("search") ?? undefined,
    status: csvParam(searchParams.get("status")),
    source: csvParam(searchParams.get("source")),
    assigned_to: assignedTo,
    website: csvParam(searchParams.get("website")),
  };
}

export function hasLeadsExportFilters(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get("search")?.trim() ||
      searchParams.get("status")?.trim() ||
      searchParams.get("source")?.trim() ||
      searchParams.get("website")?.trim() ||
      searchParams.get("assigned_to")?.trim()
  );
}

export function parseBookingsListFilters(
  searchParams: URLSearchParams,
  session: SessionPayload
): ListBookingsFilters {
  const travelFrom = searchParams.get("travel_from")?.trim() || null;
  const travelTo = searchParams.get("travel_to")?.trim() || null;
  const hotelRaw = csvParam(searchParams.get("hotel"));
  const hotel = hotelRaw?.filter(
    (v): v is "with_hotel" | "no_hotel" => v === "with_hotel" || v === "no_hotel"
  );

  return {
    search: searchParams.get("search") ?? undefined,
    status: csvParam(searchParams.get("status")),
    website: csvParam(searchParams.get("website")),
    driver: csvParam(searchParams.get("driver")),
    travel_from: travelFrom && isDateOnly(travelFrom) ? travelFrom : null,
    travel_to: travelTo && isDateOnly(travelTo) ? travelTo : null,
    hotel: hotel?.length ? hotel : undefined,
    ownedBy:
      session.role === "Employee"
        ? { userId: session.sub, agentName: session.name }
        : undefined,
  };
}

export function hasBookingsExportFilters(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get("search")?.trim() ||
      searchParams.get("status")?.trim() ||
      searchParams.get("website")?.trim() ||
      searchParams.get("driver")?.trim() ||
      searchParams.get("travel_from")?.trim() ||
      searchParams.get("travel_to")?.trim() ||
      searchParams.get("hotel")?.trim()
  );
}
