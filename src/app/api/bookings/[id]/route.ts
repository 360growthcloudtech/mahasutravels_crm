import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  bookingToDto,
  deleteBooking,
  findBookingById,
  isBookingOwnedBy,
  patchBooking,
  type PatchBookingInput,
} from "@/lib/db/bookings";
import { isBookingStatus, isMarketingChannel, parseDriversJson } from "@/lib/booking-utils";
import type { BookingDriverAssignment, Hotel, LeadComment, LeadHistoryEvent } from "@/lib/data";

export const runtime = "nodejs";

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const booking = await findBookingById(id);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (
    session.role === "Employee" &&
    !(await isBookingOwnedBy(booking, session.sub, session.name))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ booking: bookingToDto(booking) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (session.role === "Employee") {
    const existing = await findBookingById(id);
    if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!(await isBookingOwnedBy(existing, session.sub, session.name))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: PatchBookingInput = {};

  if (body.customer !== undefined) {
    const customer = readString(body.customer)?.trim() ?? "";
    if (!customer) return NextResponse.json({ error: "customer is required" }, { status: 400 });
    patch.customer = customer;
  }
  if (body.phone !== undefined) {
    patch.phone = readString(body.phone)?.trim() ?? "";
  }
  if (body.email !== undefined) patch.email = readString(body.email)?.trim() ?? "";
  if (body.city !== undefined) patch.city = readString(body.city)?.trim() ?? "";
  if (body.source !== undefined) {
    const source = readString(body.source);
    if (!source || !isMarketingChannel(source)) {
      return NextResponse.json({ error: "source is invalid" }, { status: 400 });
    }
    patch.source = source;
  }
  if (body.website !== undefined) patch.website = readString(body.website)?.trim() ?? "";
  if (body.tour_package !== undefined) {
    patch.tour_package = readString(body.tour_package)?.trim() ?? "";
  }
  if (body.pickup !== undefined) patch.pickup = readString(body.pickup)?.trim() ?? "";
  if (body.dropoff !== undefined) patch.dropoff = readString(body.dropoff)?.trim() ?? "";
  if (body.travel_date !== undefined) {
    patch.travel_date = readString(body.travel_date)?.trim() || null;
  }
  if (body.return_date !== undefined) {
    patch.return_date = readString(body.return_date)?.trim() || null;
  }
  if (body.cab_type !== undefined) patch.cab_type = readString(body.cab_type)?.trim() ?? "";
  if (body.adults !== undefined) patch.adults = readNumber(body.adults) ?? 0;
  if (body.kids !== undefined) patch.kids = readNumber(body.kids) ?? 0;
  if (body.days !== undefined) patch.days = readNumber(body.days) ?? 0;
  if (body.tour_plan !== undefined) patch.tour_plan = readString(body.tour_plan)?.trim() ?? "";
  if (body.agent !== undefined) patch.agent = readString(body.agent)?.trim() ?? "";
  if (body.driver !== undefined) patch.driver = readString(body.driver)?.trim() ?? "";
  if (body.vehicle !== undefined) patch.vehicle = readString(body.vehicle)?.trim() ?? "";
  if (body.drivers !== undefined) patch.drivers = readDrivers(body.drivers) ?? [];
  if (body.total !== undefined) patch.total = readNumber(body.total) ?? 0;
  if (body.advance !== undefined) patch.advance = readNumber(body.advance) ?? 0;
  if (body.balance !== undefined) patch.balance = readNumber(body.balance) ?? 0;
  if (body.status !== undefined) {
    const status = readString(body.status);
    if (!status || !isBookingStatus(status)) {
      return NextResponse.json({ error: "status is invalid" }, { status: 400 });
    }
    patch.status = status;
  }
  if (body.hotel !== undefined) patch.hotel = readHotel(body.hotel) ?? null;
  if (body.hotels !== undefined) patch.hotels = readHotels(body.hotels) ?? [];
  if (body.comments !== undefined) {
    patch.comments = Array.isArray(body.comments) ? (body.comments as LeadComment[]) : [];
  }
  if (body.history !== undefined) {
    patch.history = Array.isArray(body.history) ? (body.history as LeadHistoryEvent[]) : [];
  }
  if (body.lead_id !== undefined) {
    const leadId = readString(body.lead_id)?.trim();
    patch.lead_id = leadId || null;
  }

  try {
    const booking = await patchBooking(id, patch);
    return NextResponse.json({ booking: bookingToDto(booking) });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (session.role === "Employee") {
    const existing = await findBookingById(id);
    if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!(await isBookingOwnedBy(existing, session.sub, session.name))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const deleted = await deleteBooking(id);
  if (!deleted) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
