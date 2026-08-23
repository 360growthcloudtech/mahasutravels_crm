import type {
  Booking,
  BookingDriverAssignment,
  BookingStatus,
  Hotel,
  Lead,
  LeadComment,
  LeadHistoryEvent,
  MarketingChannel,
} from "@/lib/data";
import { estimateCabPrice } from "@/lib/data";

export function formatBookingNo(n: number) {
  return `BK-${n}`;
}

export const BOOKING_STATUSES: BookingStatus[] = [
  "Advance Pending",
  "Advance Received",
  "Balance Pending",
  "Fully Paid",
  "Cancelled",
  "Refunded",
];

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as string[]).includes(value);
}

export const MARKETING_CHANNELS: MarketingChannel[] = [
  "Website",
  "Google Ads",
  "Meta Ads",
  "Manual",
];

export function isMarketingChannel(value: unknown): value is MarketingChannel {
  return typeof value === "string" && (MARKETING_CHANNELS as string[]).includes(value);
}

export function mapLeadSourceToChannel(source: string): MarketingChannel {
  if (isMarketingChannel(source)) return source;
  const lower = source.trim().toLowerCase().replace(/\s+/g, "_");
  if (lower === "google_ads" || lower.includes("google")) return "Google Ads";
  if (
    lower === "meta_ads" ||
    lower.includes("meta") ||
    lower.includes("facebook") ||
    lower.includes("instagram")
  ) {
    return "Meta Ads";
  }
  if (lower === "website" || lower.includes("web") || lower === "organic") return "Website";
  if (lower === "manual") return "Manual";
  return "Manual";
}

export function bookingFromLead(lead: Lead): Omit<Booking, "id"> {
  const total = Number(lead.price) || estimateCabPrice(lead.car || "Ertiga (6+1)", lead.days || 1);
  return {
    leadId: lead.id,
    customer: lead.name,
    email: lead.email ?? "",
    city: lead.city ?? "",
    phone: lead.phone ?? "",
    source: mapLeadSourceToChannel(lead.source),
    website: lead.website,
    tourPackage: lead.tourPackage || "Custom / Plan your trip",
    pickup: lead.pickup ?? "",
    dropoff: lead.drop ?? "",
    travelDate: lead.pickupDate ?? "",
    returnDate: lead.dropDate ?? "",
    cabType: lead.car || "Ertiga (6+1)",
    adults: lead.adults ?? 2,
    kids: lead.kids ?? 0,
    days: lead.days || 1,
    tourPlan: lead.notes ?? "",
    agent: lead.assignedTo?.name ?? "Aman",
    driver: "",
    vehicle: "",
    drivers: [],
    total,
    advance: 0,
    balance: total,
    status: "Advance Pending",
    hotels: [],
    comments: [],
    history: [],
  };
}

/** Parse a single hotel object (legacy shape). */
export function parseHotelJson(value: unknown): Hotel | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const h = value as Record<string, unknown>;
  const hotelName = typeof h.hotelName === "string" ? h.hotelName : "";
  if (!hotelName.trim()) return undefined;
  return {
    hotelTemplateId: typeof h.hotelTemplateId === "string" ? h.hotelTemplateId : undefined,
    hotelName,
    address: typeof h.address === "string" ? h.address : "",
    checkIn: typeof h.checkIn === "string" ? h.checkIn : "",
    checkOut: typeof h.checkOut === "string" ? h.checkOut : "",
    roomType: typeof h.roomType === "string" ? h.roomType : "",
    roomCount: Number(h.roomCount) || 1,
    amount: Number(h.amount) || 0,
    referenceNumber: typeof h.referenceNumber === "string" ? h.referenceNumber : "",
    contactNumber: typeof h.contactNumber === "string" ? h.contactNumber : undefined,
    notes: typeof h.notes === "string" ? h.notes : undefined,
  };
}

/** Accepts legacy single hotel object or hotels array. */
export function parseHotelsJson(value: unknown): Hotel[] {
  if (Array.isArray(value)) {
    return value.map(parseHotelJson).filter((h): h is Hotel => !!h);
  }
  const single = parseHotelJson(value);
  return single ? [single] : [];
}

export function parseDriverAssignmentJson(value: unknown): BookingDriverAssignment | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const driver = typeof row.driver === "string" ? row.driver.trim() : "";
  if (!driver) return undefined;
  return {
    driver,
    vehicle: typeof row.vehicle === "string" ? row.vehicle : "",
  };
}

export function parseDriversJson(
  value: unknown,
  fallback?: { driver?: string; vehicle?: string }
): BookingDriverAssignment[] {
  if (Array.isArray(value)) {
    const parsed = value
      .map(parseDriverAssignmentJson)
      .filter((d): d is BookingDriverAssignment => !!d);
    if (parsed.length) return parsed;
  }
  const driver = fallback?.driver?.trim() ?? "";
  if (driver) {
    return [{ driver, vehicle: fallback?.vehicle?.trim() ?? "" }];
  }
  return [];
}

export function bookingHotels(booking: Pick<Booking, "hotel" | "hotels">): Hotel[] {
  if (booking.hotels?.length) return booking.hotels;
  return booking.hotel ? [booking.hotel] : [];
}

export function bookingDrivers(
  booking: Pick<Booking, "driver" | "vehicle" | "drivers">
): BookingDriverAssignment[] {
  if (booking.drivers?.length) return booking.drivers;
  if (booking.driver?.trim()) {
    return [{ driver: booking.driver, vehicle: booking.vehicle ?? "" }];
  }
  return [];
}

/** Normalize for API write: arrays + primary fields. */
export function normalizeBookingAssignments(input: {
  hotels?: Hotel[] | null;
  hotel?: Hotel | null;
  drivers?: BookingDriverAssignment[] | null;
  driver?: string;
  vehicle?: string;
}): {
  hotels: Hotel[];
  hotel: Hotel | null;
  drivers: BookingDriverAssignment[];
  driver: string;
  vehicle: string;
} {
  const hotels = (input.hotels?.length
    ? input.hotels
    : input.hotel
      ? [input.hotel]
      : []
  ).filter((h) => h.hotelName?.trim());

  const drivers = (input.drivers?.length
    ? input.drivers
    : input.driver?.trim()
      ? [{ driver: input.driver, vehicle: input.vehicle ?? "" }]
      : []
  ).filter((d) => d.driver?.trim());

  return {
    hotels,
    hotel: hotels[0] ?? null,
    drivers,
    driver: drivers[0]?.driver ?? "",
    vehicle: drivers[0]?.vehicle ?? "",
  };
}

export function parseCommentsJson(value: unknown): LeadComment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      text: String(item.text ?? ""),
      author: String(item.author ?? ""),
      createdAt: String(item.createdAt ?? ""),
    }))
    .filter((c) => c.id && c.text);
}

export function parseHistoryJson(value: unknown): LeadHistoryEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      action: (item.action as LeadHistoryEvent["action"]) ?? "note",
      label: String(item.label ?? ""),
      detail: typeof item.detail === "string" ? item.detail : undefined,
      actor: String(item.actor ?? ""),
      createdAt: String(item.createdAt ?? ""),
    }))
    .filter((e) => e.id && e.label);
}
