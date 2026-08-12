export function formatHotelNo(n: number) {
  return `HT-${n}`;
}

export const HOTEL_TEMPLATE_STATUSES = ["Active", "Draft", "Archived"] as const;

export type HotelTemplateStatusValue = (typeof HOTEL_TEMPLATE_STATUSES)[number];

export function isHotelTemplateStatus(value: unknown): value is HotelTemplateStatusValue {
  return (
    typeof value === "string" &&
    (HOTEL_TEMPLATE_STATUSES as readonly string[]).includes(value)
  );
}
