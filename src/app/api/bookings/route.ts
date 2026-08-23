import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  bookingToDto,
  createBooking,
  listBookings,
  type CreateBookingInput,
} from "@/lib/db/bookings";
import { isBookingStatus, isMarketingChannel, parseDriversJson } from "@/lib/booking-utils";
import type { BookingDriverAssignment, Hotel, LeadComment, LeadHistoryEvent } from "@/lib/data";
import { makeLeadHistoryEvent } from "@/lib/data";
import { query } from "@/lib/db";
import { formatLeadNo } from "@/lib/lead-utils";

export const runtime = "nodejs";

function csvParam(value: string | null): string[] | undefined {
  if (!value?.trim()) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function readHotel(value: unknown): Hotel | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const h = value as Record<string, unknown>;
  const hotelName = readString(h.hotelName)?.trim() ?? "";
  if (!hotelName) return null;
  return {
    hotelTemplateId: readString(h.hotelTemplateId),
    hotelName,
    address: readString(h.address)?.trim() ?? "",
    checkIn: readString(h.checkIn)?.trim() ?? "",
    checkOut: readString(h.checkOut)?.trim() ?? "",
    roomType: readString(h.roomType)?.trim() ?? "",
    roomCount: readNumber(h.roomCount) ?? 1,
    amount: readNumber(h.amount) ?? 0,
    referenceNumber: readString(h.referenceNumber)?.trim() ?? "",
    contactNumber: readString(h.contactNumber)?.trim(),
    notes: readString(h.notes)?.trim(),
  };
}

function readHotels(value: unknown): Hotel[] | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map(readHotel).filter((h): h is Hotel => !!h);
  }
  const single = readHotel(value);
  if (single === undefined) return undefined;
  return single ? [single] : [];
}

function readDrivers(value: unknown): BookingDriverAssignment[] | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return parseDriversJson(value);
}

function readComments(value: unknown): LeadComment[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value as LeadComment[];
}

function readHistory(value: unknown): LeadHistoryEvent[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value as LeadHistoryEvent[];
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const bookings = await listBookings({
    search: url.searchParams.get("search") ?? undefined,
    status: csvParam(url.searchParams.get("status")),
    website: csvParam(url.searchParams.get("website")),
    driver: csvParam(url.searchParams.get("driver")),
    ownedBy:
      session.role === "Employee"
        ? { userId: session.sub, agentName: session.name }
        : undefined,
  });

  return NextResponse.json({ bookings: bookings.map(bookingToDto) });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const customer = readString(body.customer)?.trim() ?? "";
  if (!customer) {
    return NextResponse.json({ error: "customer is required" }, { status: 400 });
  }

  const phone = readString(body.phone)?.trim() ?? "";
  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const sourceRaw = readString(body.source);
  if (sourceRaw !== undefined && !isMarketingChannel(sourceRaw)) {
    return NextResponse.json({ error: "source is invalid" }, { status: 400 });
  }

  const statusRaw = readString(body.status);
  if (statusRaw !== undefined && !isBookingStatus(statusRaw)) {
    return NextResponse.json({ error: "status is invalid" }, { status: 400 });
  }

  const leadId = readString(body.lead_id)?.trim() || null;
  let leadNo: string | null = null;
  if (leadId) {
    const { rows } = await query<{ lead_no: number }>(
      `SELECT lead_no FROM leads WHERE id = $1`,
      [leadId]
    );
    if (!rows[0]) {
      return NextResponse.json({ error: "lead_id not found" }, { status: 400 });
    }
    leadNo = formatLeadNo(rows[0].lead_no);
  }

  const total = readNumber(body.total) ?? 0;
  const advance = readNumber(body.advance) ?? 0;
  const balance = readNumber(body.balance) ?? Math.max(total - advance, 0);

  const providedHistory = readHistory(body.history);
  const history: LeadHistoryEvent[] =
    providedHistory && providedHistory.length > 0
      ? providedHistory
      : [
          makeLeadHistoryEvent("created", "Booking created", {
            detail: leadNo
              ? `Converted from lead ${leadNo}`
              : undefined,
          }),
        ];

  const input: CreateBookingInput = {
    lead_id: leadId,
    customer,
    email: readString(body.email)?.trim() ?? "",
    city: readString(body.city)?.trim() ?? "",
    phone,
    source: sourceRaw && isMarketingChannel(sourceRaw) ? sourceRaw : "Manual",
    website: readString(body.website)?.trim() ?? "",
    tour_package: readString(body.tour_package)?.trim() ?? "",
    pickup: readString(body.pickup)?.trim() ?? "",
    dropoff: readString(body.dropoff)?.trim() ?? "",
    travel_date: readString(body.travel_date)?.trim() || null,
    return_date: readString(body.return_date)?.trim() || null,
    cab_type: readString(body.cab_type)?.trim() ?? "",
    adults: readNumber(body.adults) ?? 0,
    kids: readNumber(body.kids) ?? 0,
    days: readNumber(body.days) ?? 0,
    tour_plan: readString(body.tour_plan)?.trim() ?? "",
    agent: readString(body.agent)?.trim() ?? "",
    driver: readString(body.driver)?.trim() ?? "",
    vehicle: readString(body.vehicle)?.trim() ?? "",
    drivers: readDrivers(body.drivers) ?? undefined,
    total,
    advance,
    balance,
    status: statusRaw && isBookingStatus(statusRaw) ? statusRaw : "Advance Pending",
    hotel: readHotel(body.hotel) ?? null,
    hotels: readHotels(body.hotels) ?? undefined,
    comments: readComments(body.comments) ?? [],
    history,
  };

  const booking = await createBooking(input);
  return NextResponse.json({ booking: bookingToDto(booking) }, { status: 201 });
}
