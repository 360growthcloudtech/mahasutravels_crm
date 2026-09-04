import { NextResponse } from "next/server";
import { bookingToDto, findBookingById } from "@/lib/db/bookings";

export const runtime = "nodejs";

/**
 * Public booking invoice payload.
 * Anyone with the booking UUID can view (same model as /api/proposal).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await context.params;
  if (!bookingId?.trim()) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const row = await findBookingById(bookingId);
  if (!row) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ booking: bookingToDto(row) });
}
