import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { hasBookingsExportFilters, parseBookingsListFilters } from "@/lib/api/list-filters";
import { csvResponse, exportFilename } from "@/lib/csv";
import { bookingToDto, listBookings } from "@/lib/db/bookings";
import { bookingsToCsv } from "@/lib/export/bookings-csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseBookingsListFilters(url.searchParams, session);
  const rows = await listBookings(filters);
  const dtos = rows.map(bookingToDto);
  const csv = bookingsToCsv(dtos);
  const filtered = hasBookingsExportFilters(url.searchParams);

  return csvResponse(csv, exportFilename("bookings", filtered), { count: dtos.length });
}
