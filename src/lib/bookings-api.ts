import type {
  Booking,
  BookingDriverAssignment,
  BookingStatus,
  Hotel,
  LeadComment,
  LeadHistoryEvent,
  MarketingChannel,
} from "@/lib/data";
import { normalizeBookingAssignments } from "@/lib/booking-utils";
import { buildExportParams, downloadCsvFromResponse } from "@/lib/csv-download";

export type BookingApi = {
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

export type BookingWritePayload = {
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

export function bookingFromApi(dto: BookingApi): Booking {
  const hotels = dto.hotels?.length
    ? dto.hotels
    : dto.hotel
      ? [dto.hotel]
      : [];
  const drivers = dto.drivers?.length
    ? dto.drivers
    : dto.driver
      ? [{ driver: dto.driver, vehicle: dto.vehicle ?? "" }]
      : [];
  return {
    id: dto.id,
    bookingNo: dto.booking_no,
    leadId: dto.lead_id,
    customer: dto.customer,
    email: dto.email ?? "",
    city: dto.city ?? "",
    phone: dto.phone || undefined,
    source: dto.source,
    website: dto.website || undefined,
    tourPackage: dto.tour_package ?? "",
    pickup: dto.pickup ?? "",
    dropoff: dto.dropoff ?? "",
    travelDate: dto.travel_date ?? "",
    returnDate: dto.return_date ?? "",
    cabType: dto.cab_type ?? "",
    adults: dto.adults ?? 0,
    kids: dto.kids ?? 0,
    days: dto.days ?? 0,
    tourPlan: dto.tour_plan ?? "",
    agent: dto.agent ?? "",
    driver: drivers[0]?.driver ?? dto.driver ?? "",
    vehicle: drivers[0]?.vehicle ?? dto.vehicle ?? "",
    drivers,
    total: dto.total ?? 0,
    advance: dto.advance ?? 0,
    balance: dto.balance ?? 0,
    status: dto.status,
    paymentMode: dto.payment_mode || undefined,
    hotel: hotels[0],
    hotels,
    comments: dto.comments?.length ? dto.comments : undefined,
    history: dto.history?.length ? dto.history : undefined,
    createdAt: dto.created_at || undefined,
  };
}

export function bookingToWritePayload(
  input: Omit<Booking, "id" | "bookingNo"> | Booking
): BookingWritePayload {
  const normalized = normalizeBookingAssignments({
    hotels: input.hotels,
    hotel: input.hotel,
    drivers: input.drivers,
    driver: input.driver,
    vehicle: input.vehicle,
  });
  return {
    lead_id: input.leadId ?? null,
    customer: input.customer,
    email: input.email ?? "",
    city: input.city ?? "",
    phone: input.phone ?? "",
    source: input.source,
    website: input.website ?? "",
    tour_package: input.tourPackage ?? "",
    pickup: input.pickup ?? "",
    dropoff: input.dropoff ?? "",
    travel_date: input.travelDate || null,
    return_date: input.returnDate || null,
    cab_type: input.cabType ?? "",
    adults: input.adults ?? 0,
    kids: input.kids ?? 0,
    days: input.days ?? 0,
    tour_plan: input.tourPlan ?? "",
    agent: input.agent ?? "",
    driver: normalized.driver,
    vehicle: normalized.vehicle,
    drivers: normalized.drivers,
    total: input.total ?? 0,
    advance: input.advance ?? 0,
    balance: input.balance ?? 0,
    status: input.status,
    payment_mode: input.paymentMode ?? "",
    hotel: normalized.hotel,
    hotels: normalized.hotels,
    comments: input.comments ?? [],
    history: input.history ?? [],
  };
}

export async function fetchBookings(): Promise<BookingApi[]> {
  const res = await fetch("/api/bookings", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load bookings");
  const data = (await res.json()) as { bookings?: BookingApi[] };
  return data.bookings ?? [];
}

export type BookingsExportQuery = {
  search?: string;
  status?: string[];
  website?: string[];
  driver?: string[];
  travel_from?: string;
  travel_to?: string;
  hotel?: Array<"with_hotel" | "no_hotel">;
};

export async function downloadBookingsCsv(query: BookingsExportQuery = {}): Promise<number> {
  const params = buildExportParams({
    search: query.search,
    status: query.status,
    website: query.website,
    driver: query.driver,
    travel_from: query.travel_from,
    travel_to: query.travel_to,
    hotel: query.hotel,
  });
  const qs = params.toString();
  const res = await fetch(`/api/bookings/export${qs ? `?${qs}` : ""}`, {
    credentials: "include",
    cache: "no-store",
  });
  return downloadCsvFromResponse(res, "bookings-export.csv");
}

export async function createBookingApi(payload: BookingWritePayload): Promise<BookingApi> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to create booking");
  }
  const data = (await res.json()) as { booking: BookingApi };
  return data.booking;
}

export async function updateBookingApi(
  id: string,
  payload: Partial<BookingWritePayload>
): Promise<BookingApi> {
  const res = await fetch(`/api/bookings/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update booking");
  }
  const data = (await res.json()) as { booking: BookingApi };
  return data.booking;
}

export async function deleteBookingApi(id: string): Promise<void> {
  const res = await fetch(`/api/bookings/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to delete booking");
  }
}
