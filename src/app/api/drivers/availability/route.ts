import { NextResponse } from "next/server";
import { forbidUnlessAnyPermission, requireSession } from "@/lib/api-auth";
import { listOccupiedDriverNames } from "@/lib/db/bookings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = forbidUnlessAnyPermission(session, [
    "bookings.create",
    "bookings.edit",
    "booking.and.drivers.assign",
  ]);
  if (denied) return denied;

  const url = new URL(request.url);
  const travelDate = url.searchParams.get("travel_date")?.trim() || null;
  const returnDate = url.searchParams.get("return_date")?.trim() || null;
  const excludeBookingId = url.searchParams.get("exclude_booking_id")?.trim() || null;

  const occupied = await listOccupiedDriverNames({
    travelDate,
    returnDate,
    excludeBookingId,
  });

  return NextResponse.json({ occupied });
}
