import { query } from "@/lib/db";
import type {
  BookingDriverAssignment,
  BookingStatus,
  Hotel,
  LeadComment,
  LeadHistoryEvent,
  MarketingChannel,
} from "@/lib/data";
import { toDateOnly, toIso } from "@/lib/lead-utils";
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
};

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

export async function listBookings(filters: ListBookingsFilters = {}): Promise<BookingRow[]> {
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
    const hasHotelSql = `(
      hotel IS NOT NULL
      AND (
        (jsonb_typeof(hotel::jsonb) = 'array' AND jsonb_array_length(hotel::jsonb) > 0)
        OR (jsonb_typeof(hotel::jsonb) = 'object' AND COALESCE(hotel::jsonb->>'hotelName', '') <> '')
      )
    )`;
    if (wantWith && !wantWithout) {
      clauses.push(hasHotelSql);
    } else if (wantWithout && !wantWith) {
      clauses.push(`NOT ${hasHotelSql}`);
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

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<BookingRow>(
    `${BOOKING_SELECT} ${where} ORDER BY travel_date DESC NULLS LAST, created_at DESC`,
    params
  );
  return rows;
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
      pickup, dropoff, travel_date, return_date, cab_type, adults, kids, days,
      tour_plan, agent, driver, vehicle, total, advance, balance, status, payment_mode,
      hotel, drivers, comments, history, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
      $17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27::jsonb,$28::jsonb,$29::jsonb,
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
      cab_type = $14,
      adults = $15,
      kids = $16,
      days = $17,
      tour_plan = $18,
      agent = $19,
      driver = $20,
      vehicle = $21,
      total = $22,
      advance = $23,
      balance = $24,
      status = $25,
      payment_mode = $26,
      hotel = $27::jsonb,
      drivers = $28::jsonb,
      comments = $29::jsonb,
      history = $30::jsonb,
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
      patch.travel_date !== undefined
        ? emptyDate(patch.travel_date)
        : emptyDate(toDateOnly(existing.travel_date)),
      patch.return_date !== undefined
        ? emptyDate(patch.return_date)
        : emptyDate(toDateOnly(existing.return_date)),
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

export async function deleteBooking(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM bookings WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
