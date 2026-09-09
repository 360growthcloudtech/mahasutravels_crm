import { query } from "@/lib/db";
import type { GridColumnFilter } from "@/lib/api/grid-query";
import type {
  BookingDriverAssignment,
  BookingStatus,
  Hotel,
  LeadComment,
  LeadHistoryEvent,
  MarketingChannel,
} from "@/lib/data";
import {
  appendGridColumnFilterClauses,
  buildGridOrderBy,
  type GridSqlColumn,
} from "@/lib/db/grid-sql";
import { parseLeadTime, toDateOnly, toIso, toTimeOnly } from "@/lib/lead-utils";
import {
  formatBookingNo,
  isBookingStatus,
  isMarketingChannel,
  normalizeBookingAssignments,
  parseCommentsJson,
  parseDriversJson,
  parseHistoryJson,
  parseHotelsJson,
} from "@/lib/booking-utils";

/** Allowlisted column ids for AG Grid sort / column filters on bookings. */
export const BOOKING_GRID_SQL_COLUMNS: Record<string, GridSqlColumn> = {
  customer: { expr: "customer", kind: "text" },
  phone: { expr: "phone", kind: "text" },
  email: { expr: "email", kind: "text" },
  tour_package: { expr: "tour_package", kind: "text" },
  pickup: { expr: "pickup", kind: "text" },
  dropoff: { expr: "dropoff", kind: "text" },
  cab_type: { expr: "cab_type", kind: "text" },
  driver: { expr: "driver", kind: "text" },
  vehicle: { expr: "vehicle", kind: "text" },
  agent: { expr: "agent", kind: "text" },
  website: { expr: "website", kind: "text" },
  source: { expr: "source", kind: "text" },
  status: { expr: "status", kind: "text" },
  payment_mode: { expr: "payment_mode", kind: "text" },
  total: { expr: "total", kind: "number" },
  advance: { expr: "advance", kind: "number" },
  balance: { expr: "balance", kind: "number" },
  adults: { expr: "adults", kind: "number" },
  kids: { expr: "kids", kind: "number" },
  days: { expr: "days", kind: "number" },
  booking_no: { expr: "booking_no", kind: "number" },
  travel: { expr: "travel_date", kind: "date" },
  return_date: { expr: "return_date", kind: "date" },
  created: { expr: "created_at", kind: "timestamptz" },
};

export const BOOKING_GRID_SORT_COLUMNS = Object.keys(BOOKING_GRID_SQL_COLUMNS);

export const BOOKING_GRID_FILTER_ALLOWLIST = Object.fromEntries(
  Object.entries(BOOKING_GRID_SQL_COLUMNS).map(([id, col]) => [
    id,
    col.kind === "timestamptz" || col.kind === "date"
      ? ("date" as const)
      : col.kind === "number"
        ? ("number" as const)
        : ("text" as const),
  ])
);

export type BookingRow = {
  id: string;
  booking_no: number;
  lead_id: string | null;
  customer: string;
  email: string;
  city: string;
  phone: string;
  source: string;
  website: string;
  tour_package: string;
  pickup: string;
  dropoff: string;
  travel_date: unknown;
  return_date: unknown;
  pickup_time: unknown;
  trip_reminder_sent_at: unknown;
  payment_reminder_sent_at: unknown;
  cab_type: string;
  adults: number;
  kids: number;
  days: number;
  tour_plan: string;
  agent: string;
  driver: string;
  vehicle: string;
  total: string | number;
  advance: string | number;
  balance: string | number;
  status: string;
  payment_mode: string;
  hotel: unknown;
  drivers: unknown;
  comments: unknown;
  history: unknown;
  created_at: unknown;
  updated_at: unknown;
};

export type BookingDto = {
  id: string;
  booking_no: string;
  lead_id: string | null;
  customer: string;
  email: string;
  city: string;
  phone: string;
  source: MarketingChannel;
  website: string;
  tour_package: string;
  pickup: string;
  dropoff: string;
  travel_date: string;
  return_date: string;
  /** HH:MM pickup/start time (Asia/Kolkata), empty if unset. */
  pickup_time: string;
  trip_reminder_sent_at: string | null;
  payment_reminder_sent_at: string | null;
  cab_type: string;
  adults: number;
  kids: number;
  days: number;
  tour_plan: string;
  agent: string;
  driver: string;
  vehicle: string;
  drivers: BookingDriverAssignment[];
  total: number;
  advance: number;
  balance: number;
  status: BookingStatus;
  payment_mode: string;
  hotel: Hotel | null;
  hotels: Hotel[];
  comments: LeadComment[];
  history: LeadHistoryEvent[];
  created_at: string;
  updated_at: string;
};

export type CreateBookingInput = {
  lead_id?: string | null;
  customer: string;
  email?: string;
  city?: string;
  phone?: string;
  source?: MarketingChannel;
  website?: string;
  tour_package?: string;
  pickup?: string;
  dropoff?: string;
  travel_date?: string | null;
  return_date?: string | null;
  /** HH:MM or HH:MM:SS; empty/null clears. */
  pickup_time?: string | null;
  trip_reminder_sent_at?: string | null;
  payment_reminder_sent_at?: string | null;
  cab_type?: string;
  adults?: number;
  kids?: number;
  days?: number;
  tour_plan?: string;
  agent?: string;
  driver?: string;
  vehicle?: string;
  drivers?: BookingDriverAssignment[] | null;
  total?: number;
  advance?: number;
  balance?: number;
  status?: BookingStatus;
  payment_mode?: string;
  hotel?: Hotel | null;
  hotels?: Hotel[] | null;
  comments?: LeadComment[];
  history?: LeadHistoryEvent[];
};

export type PatchBookingInput = Partial<CreateBookingInput>;

export type ListBookingsFilters = {
  search?: string;
  status?: string[];
  website?: string[];
  driver?: string[];
  /** Inclusive travel start date (YYYY-MM-DD). */
  travel_from?: string | null;
  /** Inclusive travel start date (YYYY-MM-DD). */
  travel_to?: string | null;
  /** Filter by presence of hotel add-on. */
  hotel?: Array<"with_hotel" | "no_hotel">;
  /** When set, only bookings owned by this user (lead assignee or agent name). */
  ownedBy?: { userId: string; agentName: string };
  /** AG Grid column sort (allowlisted). */
  sortBy?: string | null;
  sortDir?: "asc" | "desc" | null;
  /** AG Grid Community column filters (allowlisted). */
  colFilters?: GridColumnFilter[];
};

export type BookingsListStats = {
  total: number;
  revenue: number;
  pending_balance: number;
  with_hotel: number;
};

export type ListBookingsPageResult = {
  rows: BookingRow[];
  total: number;
  stats: BookingsListStats;
};

const HAS_HOTEL_SQL = `(
  hotel IS NOT NULL
  AND (
    (jsonb_typeof(hotel::jsonb) = 'array' AND jsonb_array_length(hotel::jsonb) > 0)
    OR (jsonb_typeof(hotel::jsonb) = 'object' AND COALESCE(hotel::jsonb->>'hotelName', '') <> '')
  )
)`;

const BOOKING_SELECT = `
  SELECT
    id,
    booking_no,
    lead_id,
    customer,
    email,
    city,
    phone,
    source,
    website,
    tour_package,
    pickup,
    dropoff,
    travel_date,
    return_date,
    pickup_time,
    trip_reminder_sent_at,
    payment_reminder_sent_at,
    cab_type,
    adults,
    kids,
    days,
    tour_plan,
    agent,
    driver,
    vehicle,
    total,
    advance,
    balance,
    status,
    payment_mode,
    hotel,
    drivers,
    comments,
    history,
    created_at,
    updated_at
  FROM bookings
`;

export function bookingToDto(row: BookingRow): BookingDto {
  const source = isMarketingChannel(row.source) ? row.source : "Manual";
  const status = isBookingStatus(row.status) ? row.status : "Advance Pending";
  const hotels = parseHotelsJson(row.hotel);
  const drivers = parseDriversJson(row.drivers, {
    driver: row.driver,
    vehicle: row.vehicle,
  });
  return {
    id: row.id,
    booking_no: formatBookingNo(row.booking_no),
    lead_id: row.lead_id,
    customer: row.customer ?? "",
    email: row.email ?? "",
    city: row.city ?? "",
    phone: row.phone ?? "",
    source,
    website: row.website ?? "",
    tour_package: row.tour_package ?? "",
    pickup: row.pickup ?? "",
    dropoff: row.dropoff ?? "",
    travel_date: toDateOnly(row.travel_date),
    return_date: toDateOnly(row.return_date),
    pickup_time: toTimeOnly(row.pickup_time),
    trip_reminder_sent_at: row.trip_reminder_sent_at
      ? toIso(row.trip_reminder_sent_at)
      : null,
    payment_reminder_sent_at: row.payment_reminder_sent_at
      ? toIso(row.payment_reminder_sent_at)
      : null,
    cab_type: row.cab_type ?? "",
    adults: Number(row.adults) || 0,
    kids: Number(row.kids) || 0,
    days: Number(row.days) || 0,
    tour_plan: row.tour_plan ?? "",
    agent: row.agent ?? "",
    driver: drivers[0]?.driver ?? row.driver ?? "",
    vehicle: drivers[0]?.vehicle ?? row.vehicle ?? "",
    drivers,
    total: Number(row.total) || 0,
    advance: Number(row.advance) || 0,
    balance: Number(row.balance) || 0,
    status,
    payment_mode: row.payment_mode ?? "",
    hotel: hotels[0] ?? null,
    hotels,
    comments: parseCommentsJson(row.comments),
    history: parseHistoryJson(row.history),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export async function findBookingById(id: string): Promise<BookingRow | null> {
  const { rows } = await query<BookingRow>(`${BOOKING_SELECT} WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Same ownership rule as employee dashboard: lead assignee or matching agent name. */
export async function isBookingOwnedBy(
  booking: BookingRow,
  userId: string,
  agentName: string
): Promise<boolean> {
  if (
    booking.agent &&
    booking.agent.trim().toLowerCase() === agentName.trim().toLowerCase()
  ) {
    return true;
  }
  if (!booking.lead_id) return false;
  const { rows } = await query<{ assigned_to: string | null }>(
    `SELECT assigned_to FROM leads WHERE id = $1`,
    [booking.lead_id]
  );
  return rows[0]?.assigned_to === userId;
}

function buildBookingsFilterClauses(filters: ListBookingsFilters): {
  clauses: string[];
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(customer) LIKE $${params.length}
        OR lower(email) LIKE $${params.length}
        OR lower(phone) LIKE $${params.length}
        OR lower('bk-' || booking_no::text) LIKE $${params.length}
        OR lower(pickup) LIKE $${params.length}
        OR lower(dropoff) LIKE $${params.length})`
    );
  }
  if (filters.status?.length) {
    params.push(filters.status);
    clauses.push(`status = ANY($${params.length}::text[])`);
  }
  if (filters.website?.length) {
    params.push(filters.website);
    clauses.push(`website = ANY($${params.length}::text[])`);
  }
  if (filters.driver?.length) {
    params.push(filters.driver);
    clauses.push(
      `(driver = ANY($${params.length}::text[])
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(drivers, '[]'::jsonb)) AS elem
          WHERE elem->>'driver' = ANY($${params.length}::text[])
        ))`
    );
  }
  if (filters.travel_from) {
    params.push(filters.travel_from);
    clauses.push(`travel_date IS NOT NULL AND travel_date::date >= $${params.length}::date`);
  }
  if (filters.travel_to) {
    params.push(filters.travel_to);
    clauses.push(`travel_date IS NOT NULL AND travel_date::date <= $${params.length}::date`);
  }
  if (filters.hotel?.length) {
    const wantWith = filters.hotel.includes("with_hotel");
    const wantWithout = filters.hotel.includes("no_hotel");
    if (wantWith && !wantWithout) {
      clauses.push(HAS_HOTEL_SQL);
    } else if (wantWithout && !wantWith) {
      clauses.push(`NOT ${HAS_HOTEL_SQL}`);
    }
    // both selected → no hotel filter (show all)
  }
  if (filters.ownedBy?.userId) {
    params.push(filters.ownedBy.userId, filters.ownedBy.agentName);
    const userIdx = params.length - 1;
    const nameIdx = params.length;
    clauses.push(
      `(
        EXISTS (
          SELECT 1 FROM leads lmine
          WHERE lmine.id = lead_id
            AND lmine.assigned_to = $${userIdx}::uuid
        )
        OR lower(trim(COALESCE(agent, ''))) = lower(trim($${nameIdx}))
      )`
    );
  }

  if (filters.colFilters?.length) {
    appendGridColumnFilterClauses(filters.colFilters, BOOKING_GRID_SQL_COLUMNS, clauses, params);
  }

  return { clauses, params };
}

function bookingsOrderBy(filters: ListBookingsFilters): string {
  return buildGridOrderBy(
    filters.sortBy && filters.sortDir
      ? { sortBy: filters.sortBy, sortDir: filters.sortDir }
      : null,
    BOOKING_GRID_SQL_COLUMNS,
    "travel_date DESC NULLS LAST, created_at DESC"
  );
}

export async function listBookings(filters: ListBookingsFilters = {}): Promise<BookingRow[]> {
  const { clauses, params } = buildBookingsFilterClauses(filters);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<BookingRow>(
    `${BOOKING_SELECT} ${where} ORDER BY ${bookingsOrderBy(filters)}`,
    params
  );
  return rows;
}

/**
 * Paginated booking list for CRM tables. Same filters as listBookings, plus LIMIT/OFFSET
 * and aggregate stats for the filtered set.
 */
export async function listBookingsPage(
  filters: ListBookingsFilters = {},
  options: { limit: number; offset: number }
): Promise<ListBookingsPageResult> {
  const limit = Math.min(Math.max(Math.floor(options.limit) || 25, 1), 100);
  const offset = Math.max(Math.floor(options.offset) || 0, 0);
  const { clauses, params } = buildBookingsFilterClauses(filters);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows: statsRows } = await query<{
    total: string;
    revenue: string;
    pending_balance: string;
    with_hotel: string;
  }>(
    `SELECT
       COUNT(*)::text AS total,
       COALESCE(SUM(total) FILTER (
         WHERE status NOT IN ('Cancelled', 'Refunded')
       ), 0)::text AS revenue,
       COALESCE(SUM(balance), 0)::text AS pending_balance,
       COUNT(*) FILTER (WHERE ${HAS_HOTEL_SQL})::text AS with_hotel
     FROM bookings
     ${where}`,
    params
  );

  const total = Number(statsRows[0]?.total) || 0;
  const stats: BookingsListStats = {
    total,
    revenue: Number(statsRows[0]?.revenue) || 0,
    pending_balance: Number(statsRows[0]?.pending_balance) || 0,
    with_hotel: Number(statsRows[0]?.with_hotel) || 0,
  };

  if (total === 0 || offset >= total) {
    return { rows: [], total, stats };
  }

  const { rows } = await query<BookingRow>(
    `${BOOKING_SELECT} ${where}
     ORDER BY ${bookingsOrderBy(filters)}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { rows, total, stats };
}

function emptyDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return value.trim().slice(0, 10);
}

export async function createBooking(input: CreateBookingInput): Promise<BookingRow> {
  const total = Number(input.total) || 0;
  const advance = Number(input.advance) || 0;
  const balance =
    input.balance !== undefined ? Number(input.balance) || 0 : Math.max(total - advance, 0);
  const status = input.status && isBookingStatus(input.status) ? input.status : "Advance Pending";
  const source =
    input.source && isMarketingChannel(input.source) ? input.source : "Manual";
  const normalized = normalizeBookingAssignments({
    hotels: input.hotels,
    hotel: input.hotel,
    drivers: input.drivers,
    driver: input.driver,
    vehicle: input.vehicle,
  });

  const { rows } = await query<{ id: string }>(
    `INSERT INTO bookings (
      lead_id, customer, email, city, phone, source, website, tour_package,
      pickup, dropoff, travel_date, return_date, pickup_time, cab_type, adults, kids, days,
      tour_plan, agent, driver, vehicle, total, advance, balance, status, payment_mode,
      hotel, drivers, comments, history, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
      $18,$19,$20,$21,$22,$23,$24,$25,$26,$27::jsonb,$28::jsonb,$29::jsonb,$30::jsonb,
      now(), now()
    )
    RETURNING id`,
    [
      input.lead_id ?? null,
      input.customer.trim(),
      input.email?.trim() ?? "",
      input.city?.trim() ?? "",
      input.phone?.trim() ?? "",
      source,
      input.website?.trim() ?? "",
      input.tour_package?.trim() ?? "",
      input.pickup?.trim() ?? "",
      input.dropoff?.trim() ?? "",
      emptyDate(input.travel_date),
      emptyDate(input.return_date),
      parseLeadTime(input.pickup_time ?? null),
      input.cab_type?.trim() ?? "",
      Math.max(0, Math.floor(Number(input.adults) || 0)),
      Math.max(0, Math.floor(Number(input.kids) || 0)),
      Math.max(0, Math.floor(Number(input.days) || 0)),
      input.tour_plan?.trim() ?? "",
      input.agent?.trim() ?? "",
      normalized.driver,
      normalized.vehicle,
      total,
      advance,
      balance,
      status,
      input.payment_mode?.trim() ?? "",
      normalized.hotels.length ? JSON.stringify(normalized.hotels) : null,
      JSON.stringify(normalized.drivers),
      JSON.stringify(input.comments ?? []),
      JSON.stringify(input.history ?? []),
    ]
  );

  const booking = await findBookingById(rows[0].id);
  if (!booking) throw new Error("Failed to load created booking");
  return booking;
}

export async function patchBooking(id: string, patch: PatchBookingInput): Promise<BookingRow> {
  const existing = await findBookingById(id);
  if (!existing) throw new Error("NOT_FOUND");

  const total =
    patch.total !== undefined ? Number(patch.total) || 0 : Number(existing.total) || 0;
  const advance =
    patch.advance !== undefined ? Number(patch.advance) || 0 : Number(existing.advance) || 0;
  const balance =
    patch.balance !== undefined
      ? Number(patch.balance) || 0
      : patch.total !== undefined || patch.advance !== undefined
        ? Math.max(total - advance, 0)
        : Number(existing.balance) || 0;

  const source =
    patch.source !== undefined
      ? isMarketingChannel(patch.source)
        ? patch.source
        : existing.source
      : existing.source;
  const status =
    patch.status !== undefined
      ? isBookingStatus(patch.status)
        ? patch.status
        : existing.status
      : existing.status;
  const paymentMode =
    patch.payment_mode !== undefined
      ? patch.payment_mode.trim()
      : existing.payment_mode ?? "";

  const hotelPatchProvided =
    patch.hotels !== undefined || patch.hotel !== undefined;
  const driversArrayProvided = patch.drivers !== undefined;
  const primaryDriverPatched =
    patch.driver !== undefined || patch.vehicle !== undefined;

  const existingHotels = parseHotelsJson(existing.hotel);
  const existingDrivers = parseDriversJson(existing.drivers, {
    driver: existing.driver,
    vehicle: existing.vehicle,
  });

  let nextHotels = existingHotels;
  if (hotelPatchProvided) {
    nextHotels =
      patch.hotels !== undefined
        ? patch.hotels ?? []
        : patch.hotel
          ? [patch.hotel]
          : [];
  }

  let nextDrivers = existingDrivers;
  if (driversArrayProvided) {
    nextDrivers = patch.drivers ?? [];
  } else if (primaryDriverPatched) {
    if (existingDrivers.length === 0) {
      nextDrivers = [
        {
          driver: patch.driver ?? "",
          vehicle: patch.vehicle ?? "",
        },
      ];
    } else {
      nextDrivers = existingDrivers.map((d, i) =>
        i === 0
          ? {
              driver: patch.driver !== undefined ? patch.driver : d.driver,
              vehicle: patch.vehicle !== undefined ? patch.vehicle : d.vehicle,
            }
          : d
      );
    }
  }

  const normalized = normalizeBookingAssignments({
    hotels: nextHotels,
    drivers: nextDrivers,
  });

  const hotelJson = normalized.hotels.length ? JSON.stringify(normalized.hotels) : null;
  const driversJson = JSON.stringify(normalized.drivers);

  const nextTravelDate =
    patch.travel_date !== undefined
      ? emptyDate(patch.travel_date)
      : emptyDate(toDateOnly(existing.travel_date));
  const nextPickupTime =
    patch.pickup_time !== undefined
      ? parseLeadTime(patch.pickup_time)
      : parseLeadTime(toTimeOnly(existing.pickup_time) || null);
  const scheduleChanged =
    nextTravelDate !== emptyDate(toDateOnly(existing.travel_date)) ||
    (nextPickupTime || null) !== (parseLeadTime(toTimeOnly(existing.pickup_time) || null) || null);
  const nextReminderSentAt = scheduleChanged
    ? null
    : patch.trip_reminder_sent_at !== undefined
      ? patch.trip_reminder_sent_at
      : existing.trip_reminder_sent_at
        ? toIso(existing.trip_reminder_sent_at)
        : null;
  const nextPaymentReminderSentAt = scheduleChanged
    ? null
    : patch.payment_reminder_sent_at !== undefined
      ? patch.payment_reminder_sent_at
      : existing.payment_reminder_sent_at
        ? toIso(existing.payment_reminder_sent_at)
        : null;

  await query(
    `UPDATE bookings SET
      lead_id = $2,
      customer = $3,
      email = $4,
      city = $5,
      phone = $6,
      source = $7,
      website = $8,
      tour_package = $9,
      pickup = $10,
      dropoff = $11,
      travel_date = $12,
      return_date = $13,
      pickup_time = $14,
      cab_type = $15,
      adults = $16,
      kids = $17,
      days = $18,
      tour_plan = $19,
      agent = $20,
      driver = $21,
      vehicle = $22,
      total = $23,
      advance = $24,
      balance = $25,
      status = $26,
      payment_mode = $27,
      hotel = $28::jsonb,
      drivers = $29::jsonb,
      comments = $30::jsonb,
      history = $31::jsonb,
      trip_reminder_sent_at = $32,
      payment_reminder_sent_at = $33,
      updated_at = now()
     WHERE id = $1`,
    [
      id,
      patch.lead_id !== undefined ? patch.lead_id : existing.lead_id,
      patch.customer !== undefined ? patch.customer.trim() : existing.customer,
      patch.email !== undefined ? patch.email.trim() : existing.email,
      patch.city !== undefined ? patch.city.trim() : existing.city,
      patch.phone !== undefined ? patch.phone.trim() : existing.phone,
      source,
      patch.website !== undefined ? patch.website.trim() : existing.website,
      patch.tour_package !== undefined ? patch.tour_package.trim() : existing.tour_package,
      patch.pickup !== undefined ? patch.pickup.trim() : existing.pickup,
      patch.dropoff !== undefined ? patch.dropoff.trim() : existing.dropoff,
      nextTravelDate,
      patch.return_date !== undefined
        ? emptyDate(patch.return_date)
        : emptyDate(toDateOnly(existing.return_date)),
      nextPickupTime,
      patch.cab_type !== undefined ? patch.cab_type.trim() : existing.cab_type,
      patch.adults !== undefined
        ? Math.max(0, Math.floor(Number(patch.adults) || 0))
        : Number(existing.adults) || 0,
      patch.kids !== undefined
        ? Math.max(0, Math.floor(Number(patch.kids) || 0))
        : Number(existing.kids) || 0,
      patch.days !== undefined
        ? Math.max(0, Math.floor(Number(patch.days) || 0))
        : Number(existing.days) || 0,
      patch.tour_plan !== undefined ? patch.tour_plan.trim() : existing.tour_plan,
      patch.agent !== undefined ? patch.agent.trim() : existing.agent,
      normalized.driver,
      normalized.vehicle,
      total,
      advance,
      balance,
      status,
      paymentMode,
      hotelJson,
      driversJson,
      JSON.stringify(
        patch.comments !== undefined ? patch.comments : parseCommentsJson(existing.comments)
      ),
      JSON.stringify(
        patch.history !== undefined ? patch.history : parseHistoryJson(existing.history)
      ),
      nextReminderSentAt,
      nextPaymentReminderSentAt,
    ]
  );

  const booking = await findBookingById(id);
  if (!booking) throw new Error("NOT_FOUND");
  return booking;
}

export type OccupiedDriversQuery = {
  travelDate: string | null;
  returnDate?: string | null;
  excludeBookingId?: string | null;
};

/** Driver names already assigned on overlapping active bookings for the given trip window. */
export async function listOccupiedDriverNames(
  opts: OccupiedDriversQuery
): Promise<string[]> {
  const travel = opts.travelDate?.trim().slice(0, 10);
  if (!travel) return [];
  const returnDate = opts.returnDate?.trim().slice(0, 10) || travel;

  const params: unknown[] = [returnDate, travel];
  let excludeClause = "";
  if (opts.excludeBookingId?.trim()) {
    params.push(opts.excludeBookingId.trim());
    excludeClause = `AND b.id <> $${params.length}::uuid`;
  }

  const overlapClause = `b.status NOT IN ('Cancelled', 'Refunded')
    AND b.travel_date IS NOT NULL
    AND b.travel_date::date <= $1::date
    AND COALESCE(b.return_date, b.travel_date)::date >= $2::date
    ${excludeClause}`;

  const { rows } = await query<{ driver_name: string }>(
    `SELECT DISTINCT names.driver_name
     FROM (
       SELECT b.driver AS driver_name
       FROM bookings b
       WHERE ${overlapClause}
       UNION
       SELECT elem->>'driver' AS driver_name
       FROM bookings b
       CROSS JOIN jsonb_array_elements(COALESCE(b.drivers, '[]'::jsonb)) AS elem
       WHERE ${overlapClause}
     ) names
     WHERE names.driver_name IS NOT NULL AND TRIM(names.driver_name) <> ''
     ORDER BY names.driver_name`,
    params
  );
  return rows.map((r) => r.driver_name);
}

/** Returns assigned driver names that conflict with another booking on the same dates. */
export async function findConflictingDriverNames(
  driverNames: string[],
  opts: OccupiedDriversQuery
): Promise<string[]> {
  if (!driverNames.length) return [];
  const occupied = new Set(await listOccupiedDriverNames(opts));
  return driverNames.filter((name) => occupied.has(name));
}

/** Bookings whose travel_date+pickup_time (IST) falls in the trip reminder window. */
export async function listBookingsDueForTripReminder(opts?: {
  hoursBefore?: number;
  windowMinutes?: number;
}): Promise<BookingRow[]> {
  const hoursBefore = opts?.hoursBefore ?? 3;
  const windowMinutes = opts?.windowMinutes ?? 15;
  const center = Math.round(hoursBefore * 60);
  const half = Math.round(windowMinutes);
  const lowerMinutes = Math.max(0, center - half);
  const upperMinutes = center + half;

  const { rows } = await query<BookingRow>(
    `${BOOKING_SELECT}
     WHERE pickup_time IS NOT NULL
       AND travel_date IS NOT NULL
       AND trip_reminder_sent_at IS NULL
       AND status NOT IN ('Cancelled', 'Refunded')
       AND ((travel_date + pickup_time) AT TIME ZONE 'Asia/Kolkata')
           BETWEEN (now() + make_interval(mins => $1::int))
               AND (now() + make_interval(mins => $2::int))
     ORDER BY travel_date ASC, pickup_time ASC`,
    [lowerMinutes, upperMinutes]
  );
  return rows;
}

/** Mark reminder sent and optionally append history in one update. */
export async function markTripReminderSent(
  id: string,
  history: LeadHistoryEvent[],
  opts?: { claimOnly?: boolean }
): Promise<BookingRow | null> {
  const claimOnly = opts?.claimOnly !== false;
  const { rows } = await query<BookingRow>(
    `UPDATE bookings SET
       trip_reminder_sent_at = COALESCE(trip_reminder_sent_at, now()),
       history = $2::jsonb,
       updated_at = now()
     WHERE id = $1
       AND ($3::boolean = false OR trip_reminder_sent_at IS NULL)
     RETURNING *`,
    [id, JSON.stringify(history), claimOnly]
  );
  return rows[0] ?? null;
}

/** Bookings due before pickup with unpaid balance (window from env/cron config). */
export async function listBookingsDueForPaymentReminder(opts?: {
  hoursBefore?: number;
  windowMinutes?: number;
}): Promise<BookingRow[]> {
  const hoursBefore = opts?.hoursBefore ?? 12;
  const windowMinutes = opts?.windowMinutes ?? 15;
  const center = Math.round(hoursBefore * 60);
  const half = Math.round(windowMinutes);
  const lowerMinutes = Math.max(0, center - half);
  const upperMinutes = center + half;

  const { rows } = await query<BookingRow>(
    `${BOOKING_SELECT}
     WHERE pickup_time IS NOT NULL
       AND travel_date IS NOT NULL
       AND payment_reminder_sent_at IS NULL
       AND balance > 0
       AND status NOT IN ('Cancelled', 'Refunded')
       AND ((travel_date + pickup_time) AT TIME ZONE 'Asia/Kolkata')
           BETWEEN (now() + make_interval(mins => $1::int))
               AND (now() + make_interval(mins => $2::int))
     ORDER BY travel_date ASC, pickup_time ASC`,
    [lowerMinutes, upperMinutes]
  );
  return rows;
}

/**
 * Claim payment reminder + set history. First call (claim) only succeeds when
 * payment_reminder_sent_at IS NULL so overlapping cron ticks do not double-send.
 */
export async function markPaymentReminderSent(
  id: string,
  history: LeadHistoryEvent[],
  opts?: { claimOnly?: boolean }
): Promise<BookingRow | null> {
  const claimOnly = opts?.claimOnly !== false;
  const { rows } = await query<BookingRow>(
    `UPDATE bookings SET
       payment_reminder_sent_at = COALESCE(payment_reminder_sent_at, now()),
       history = $2::jsonb,
       updated_at = now()
     WHERE id = $1
       AND ($3::boolean = false OR payment_reminder_sent_at IS NULL)
     RETURNING *`,
    [id, JSON.stringify(history), claimOnly]
  );
  return rows[0] ?? null;
}

export async function deleteBooking(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM bookings WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
