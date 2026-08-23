/** CRM route → required `*.view` permission key. */
export const ROUTE_VIEW_PERMISSION: Record<string, string> = {
  "/": "dashboard.view",
  "/leads": "leads.view",
  "/bookings": "bookings.view",
  "/marketing": "ad.spend.and.marketing.view",
  "/assignments": "booking.and.drivers.view",
  "/itineraries": "itineraries.view",
  "/hotels": "hotels.view",
  "/drivers": "drivers.and.vehicles.view",
  "/settings": "roles.and.permissions.view",
};

export function viewPermissionForPath(pathname: string): string | null {
  if (ROUTE_VIEW_PERMISSION[pathname]) return ROUTE_VIEW_PERMISSION[pathname];
  const match = Object.keys(ROUTE_VIEW_PERMISSION)
    .filter((href) => href !== "/" && pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ROUTE_VIEW_PERMISSION[match] : null;
}
