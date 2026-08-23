import type { BookingDto } from "@/lib/db/bookings";
import { rowsToCsv } from "@/lib/csv";

export const BOOKING_CSV_HEADERS = [
  "Booking No",
  "Customer",
  "Phone",
  "Email",
  "City",
  "Payment Status",
  "Source",
  "Website",
  "Tour Package",
  "Pickup",
  "Dropoff",
  "Travel Date",
  "Return Date",
  "Cab Type",
  "Adults",
  "Kids",
  "Days",
  "Agent",
  "Driver",
  "Vehicle",
  "Drivers",
  "Hotels",
  "Total",
  "Advance",
  "Balance",
  "Lead ID",
  "Created At",
] as const;

export function bookingToCsvRow(dto: BookingDto): unknown[] {
  const driversSummary = (dto.drivers ?? [])
    .map((d) => (d.vehicle ? `${d.driver} · ${d.vehicle}` : d.driver))
    .filter(Boolean)
    .join("; ");
  const hotelsSummary = (dto.hotels ?? [])
    .map((h) => h.hotelName)
    .filter(Boolean)
    .join("; ");

  return [
    dto.booking_no,
    dto.customer,
    dto.phone,
    dto.email,
    dto.city,
    dto.status,
    dto.source,
    dto.website,
    dto.tour_package,
    dto.pickup,
    dto.dropoff,
    dto.travel_date,
    dto.return_date,
    dto.cab_type,
    dto.adults,
    dto.kids,
    dto.days,
    dto.agent,
    dto.driver,
    dto.vehicle,
    driversSummary,
    hotelsSummary,
    dto.total,
    dto.advance,
    dto.balance,
    dto.lead_id ?? "",
    dto.created_at,
  ];
}

export function bookingsToCsv(bookings: BookingDto[]): string {
  return rowsToCsv([...BOOKING_CSV_HEADERS], bookings.map(bookingToCsvRow));
}
