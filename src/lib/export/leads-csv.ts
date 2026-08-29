import type { LeadDto } from "@/lib/db/leads";
import { sourceLabel } from "@/lib/lead-utils";
import { rowsToCsv } from "@/lib/csv";

export const LEAD_CSV_HEADERS = [
  "Lead No",
  "Name",
  "Phone",
  "Email",
  "Status",
  "Source",
  "Website",
  "City",
  "Assigned To",
  "Tour Package",
  "Pickup",
  "Drop",
  "Pickup Date",
  "Drop Date",
  "Next Follow-up Date",
  "Next Follow-up Time",
  "Car",
  "Adults",
  "Kids",
  "Days",
  "Price",
  "Inquiry Count",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "Page URL",
  "Last Inquiry At",
  "Created At",
] as const;

export function leadToCsvRow(dto: LeadDto): unknown[] {
  return [
    dto.lead_no,
    dto.name,
    dto.phone,
    dto.email,
    dto.status,
    sourceLabel(dto.source),
    dto.website ?? "",
    dto.city,
    dto.assigned_to?.name ?? "",
    dto.tour_package,
    dto.pickup,
    dto.drop,
    dto.pickup_date,
    dto.drop_date,
    dto.next_follow_up_date,
    dto.next_follow_up_time,
    dto.car,
    dto.adults,
    dto.kids,
    dto.days,
    dto.price,
    dto.inquiry_count,
    dto.utm_source ?? "",
    dto.utm_medium ?? "",
    dto.utm_campaign ?? "",
    dto.page_url ?? "",
    dto.last_inquiry_at,
    dto.created_at,
  ];
}

export function leadsToCsv(leads: LeadDto[]): string {
  return rowsToCsv([...LEAD_CSV_HEADERS], leads.map(leadToCsvRow));
}
