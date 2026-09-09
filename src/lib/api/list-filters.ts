import type { SessionPayload } from "@/lib/auth-jwt";
import type { ListLeadsFilters } from "@/lib/db/leads";
import { LEAD_GRID_FILTER_ALLOWLIST, LEAD_GRID_SORT_COLUMNS } from "@/lib/db/leads";
import type { ListDriversFilters } from "@/lib/db/drivers";
import {
  DRIVER_GRID_FILTER_ALLOWLIST,
  DRIVER_GRID_SORT_COLUMNS,
} from "@/lib/db/drivers";
import type { ListHotelsFilters } from "@/lib/db/hotels";
import {
  HOTEL_GRID_FILTER_ALLOWLIST,
  HOTEL_GRID_SORT_COLUMNS,
} from "@/lib/db/hotels";
import type { ListItinerariesFilters } from "@/lib/db/itineraries";
import {
  ITINERARY_GRID_FILTER_ALLOWLIST,
  ITINERARY_GRID_SORT_COLUMNS,
} from "@/lib/db/itineraries";
import type { ListBookingsFilters } from "@/lib/db/bookings";
import {
  BOOKING_GRID_FILTER_ALLOWLIST,
  BOOKING_GRID_SORT_COLUMNS,
} from "@/lib/db/bookings";
import type { ListAdSpendsFilters } from "@/lib/db/ad-spends";
import {
  AD_SPEND_GRID_FILTER_ALLOWLIST,
  AD_SPEND_GRID_SORT_COLUMNS,
} from "@/lib/db/ad-spends";
import type { ListUsersFilters } from "@/lib/db/users";
import {
  USER_GRID_FILTER_ALLOWLIST,
  USER_GRID_SORT_COLUMNS,
} from "@/lib/db/users";
import type { ListPermissionsFilters } from "@/lib/db/permissions";
import {
  PERMISSION_GRID_FILTER_ALLOWLIST,
  PERMISSION_GRID_SORT_COLUMNS,
} from "@/lib/db/permissions";
import {
  parseGridColumnFilters,
  parseGridPagination,
  parseGridSort,
} from "@/lib/api/grid-query";

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

  const createdFrom = searchParams.get("created_from")?.trim() || null;
  const createdTo = searchParams.get("created_to")?.trim() || null;
  const sort = parseGridSort(searchParams, LEAD_GRID_SORT_COLUMNS);
  const colFilters = parseGridColumnFilters(searchParams, LEAD_GRID_FILTER_ALLOWLIST);

  return {
    search: searchParams.get("search") ?? undefined,
    status: csvParam(searchParams.get("status")),
    source: csvParam(searchParams.get("source")),
    assigned_to: assignedTo,
    website: csvParam(searchParams.get("website")),
    created_from: createdFrom && isDateOnly(createdFrom) ? createdFrom : null,
    created_to: createdTo && isDateOnly(createdTo) ? createdTo : null,
    sortBy: sort?.sortBy ?? null,
    sortDir: sort?.sortDir ?? null,
    colFilters: colFilters.length ? colFilters : undefined,
  };
}

export function parseLeadsPagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  /** When true (default), return paginated payload with total/stats. */
  paginated: boolean;
} {
  return parseGridPagination(searchParams);
}

export function parseDriversListFilters(searchParams: URLSearchParams): ListDriversFilters {
  const sort = parseGridSort(searchParams, DRIVER_GRID_SORT_COLUMNS);
  const colFilters = parseGridColumnFilters(searchParams, DRIVER_GRID_FILTER_ALLOWLIST);
  return {
    search: searchParams.get("search") ?? undefined,
    status: csvParam(searchParams.get("status")),
    sortBy: sort?.sortBy ?? null,
    sortDir: sort?.sortDir ?? null,
    colFilters: colFilters.length ? colFilters : undefined,
  };
}

export function parseHotelsListFilters(searchParams: URLSearchParams): ListHotelsFilters {
  const sort = parseGridSort(searchParams, HOTEL_GRID_SORT_COLUMNS);
  const colFilters = parseGridColumnFilters(searchParams, HOTEL_GRID_FILTER_ALLOWLIST);
  return {
    search: searchParams.get("search") ?? undefined,
    status: csvParam(searchParams.get("status")),
    sortBy: sort?.sortBy ?? null,
    sortDir: sort?.sortDir ?? null,
    colFilters: colFilters.length ? colFilters : undefined,
  };
}

export function parseItinerariesListFilters(
  searchParams: URLSearchParams
): ListItinerariesFilters {
  const sort = parseGridSort(searchParams, ITINERARY_GRID_SORT_COLUMNS);
  const colFilters = parseGridColumnFilters(searchParams, ITINERARY_GRID_FILTER_ALLOWLIST);
  return {
    search: searchParams.get("search") ?? undefined,
    status: csvParam(searchParams.get("status")),
    sortBy: sort?.sortBy ?? null,
    sortDir: sort?.sortDir ?? null,
    colFilters: colFilters.length ? colFilters : undefined,
  };
}

export function hasLeadsExportFilters(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get("search")?.trim() ||
      searchParams.get("status")?.trim() ||
      searchParams.get("source")?.trim() ||
      searchParams.get("website")?.trim() ||
      searchParams.get("assigned_to")?.trim() ||
      searchParams.get("created_from")?.trim() ||
      searchParams.get("created_to")?.trim() ||
      searchParams.get("colFilters")?.trim() ||
      searchParams.get("sortBy")?.trim()
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
  const sort = parseGridSort(searchParams, BOOKING_GRID_SORT_COLUMNS);
  const colFilters = parseGridColumnFilters(searchParams, BOOKING_GRID_FILTER_ALLOWLIST);

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
    sortBy: sort?.sortBy ?? null,
    sortDir: sort?.sortDir ?? null,
    colFilters: colFilters.length ? colFilters : undefined,
  };
}

export function parseBookingsPagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  /** When true (default), return paginated payload with total/stats. */
  paginated: boolean;
} {
  return parseGridPagination(searchParams);
}

export function hasBookingsExportFilters(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get("search")?.trim() ||
      searchParams.get("status")?.trim() ||
      searchParams.get("website")?.trim() ||
      searchParams.get("driver")?.trim() ||
      searchParams.get("travel_from")?.trim() ||
      searchParams.get("travel_to")?.trim() ||
      searchParams.get("hotel")?.trim() ||
      searchParams.get("colFilters")?.trim() ||
      searchParams.get("sortBy")?.trim()
  );
}

export function parseAdSpendsListFilters(searchParams: URLSearchParams): ListAdSpendsFilters {
  const sort = parseGridSort(searchParams, AD_SPEND_GRID_SORT_COLUMNS);
  const colFilters = parseGridColumnFilters(searchParams, AD_SPEND_GRID_FILTER_ALLOWLIST);
  return {
    search: searchParams.get("search") ?? undefined,
    platform: csvParam(searchParams.get("platform")),
    website: csvParam(searchParams.get("website")),
    sortBy: sort?.sortBy ?? null,
    sortDir: sort?.sortDir ?? null,
    colFilters: colFilters.length ? colFilters : undefined,
  };
}

export function parseUsersListFilters(searchParams: URLSearchParams): ListUsersFilters {
  const sort = parseGridSort(searchParams, USER_GRID_SORT_COLUMNS);
  const colFilters = parseGridColumnFilters(searchParams, USER_GRID_FILTER_ALLOWLIST);
  return {
    search: searchParams.get("search") ?? undefined,
    role: csvParam(searchParams.get("role")),
    status: csvParam(searchParams.get("status")),
    sortBy: sort?.sortBy ?? null,
    sortDir: sort?.sortDir ?? null,
    colFilters: colFilters.length ? colFilters : undefined,
  };
}

export function parsePermissionsListFilters(
  searchParams: URLSearchParams
): ListPermissionsFilters {
  const sort = parseGridSort(searchParams, PERMISSION_GRID_SORT_COLUMNS);
  const colFilters = parseGridColumnFilters(searchParams, PERMISSION_GRID_FILTER_ALLOWLIST);
  return {
    search: searchParams.get("search") ?? undefined,
    module: csvParam(searchParams.get("module")),
    action: csvParam(searchParams.get("action")),
    sortBy: sort?.sortBy ?? null,
    sortDir: sort?.sortDir ?? null,
    colFilters: colFilters.length ? colFilters : undefined,
  };
}
