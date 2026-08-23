export type PermissionAction = "view" | "create" | "edit" | "delete" | "assign" | "export" | "comment" | "quote" | "create_booking";

export type PermissionDefModule = {
  module: string;
  actions: Array<{ action: PermissionAction; label: string; description?: string }>;
};

export type CatalogPermission = {
  key: string;
  module: string;
  action: PermissionAction;
  label: string;
  description?: string;
  sort_order: number;
};

export function slugModule(module: string) {
  return module
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

/** Single source of truth for CRM master permissions. */
export const PERMISSION_DEF_MODULES: PermissionDefModule[] = [
  {
    module: "Dashboard",
    actions: [
      { action: "view", label: "View Dashboard", description: "See CRM overview and KPIs" },
    ],
  },
  {
    module: "Leads",
    actions: [
      { action: "view", label: "View Leads" },
      { action: "create", label: "Create Lead" },
      { action: "edit", label: "Edit Lead" },
      { action: "delete", label: "Delete Lead" },
      { action: "assign", label: "Assign Lead", description: "Assign leads to agents" },
      {
        action: "export",
        label: "Export Leads",
        description: "Download filtered leads CSV",
      },
      {
        action: "comment",
        label: "Comment on Lead",
        description: "View and add notes on leads",
      },
      {
        action: "quote",
        label: "Send Quote",
        description: "Build and send quotes for leads",
      },
      {
        action: "create_booking",
        label: "Create Booking from Lead",
        description: "Convert a lead into a booking",
      },
    ],
  },
  {
    module: "Bookings",
    actions: [
      { action: "view", label: "View Bookings" },
      { action: "create", label: "Create Booking" },
      { action: "edit", label: "Edit Booking" },
      { action: "delete", label: "Delete Booking" },
      {
        action: "export",
        label: "Export Bookings",
        description: "Download filtered bookings CSV",
      },
      {
        action: "comment",
        label: "Comment on Booking",
        description: "View and add notes on bookings",
      },
    ],
  },
  {
    module: "Ad Spend & Marketing",
    actions: [
      { action: "view", label: "View Ad Spend", description: "See marketing spend and ROI entries" },
      { action: "create", label: "Create Ad Spend" },
      { action: "edit", label: "Edit Ad Spend" },
      { action: "delete", label: "Delete Ad Spend" },
    ],
  },
  {
    module: "Booking & Drivers",
    actions: [
      { action: "view", label: "View Assignments", description: "See booking–driver mapping" },
      {
        action: "assign",
        label: "Assign Driver",
        description: "Assign or reassign drivers to bookings",
      },
    ],
  },
  {
    module: "Itineraries",
    actions: [
      { action: "view", label: "View Itineraries" },
      { action: "create", label: "Create Itinerary" },
      { action: "edit", label: "Edit Itinerary" },
      { action: "delete", label: "Delete Itinerary" },
    ],
  },
  {
    module: "Hotels",
    actions: [
      { action: "view", label: "View Hotels" },
      { action: "create", label: "Create Hotel Template" },
      { action: "edit", label: "Edit Hotel Template" },
      { action: "delete", label: "Delete Hotel Template" },
    ],
  },
  {
    module: "Drivers & Vehicles",
    actions: [
      { action: "view", label: "View Drivers" },
      { action: "create", label: "Create Driver" },
      { action: "edit", label: "Edit Driver" },
      { action: "delete", label: "Delete Driver" },
    ],
  },
  {
    module: "Roles & Permissions",
    actions: [
      {
        action: "view",
        label: "View Roles",
        description: "See members and system permissions",
      },
      { action: "create", label: "Invite Member" },
      { action: "edit", label: "Edit Member & Permissions" },
      { action: "delete", label: "Remove Member" },
    ],
  },
];

export function buildPermissionsCatalog(): CatalogPermission[] {
  const rows: CatalogPermission[] = [];
  let sort = 0;
  for (const mod of PERMISSION_DEF_MODULES) {
    for (const a of mod.actions) {
      rows.push({
        key: `${slugModule(mod.module)}.${a.action}`,
        module: mod.module,
        action: a.action,
        label: a.label,
        description: a.description,
        sort_order: sort++,
      });
    }
  }
  return rows;
}

export const PERMISSIONS_CATALOG = buildPermissionsCatalog();

export const ALL_PERMISSION_KEYS = PERMISSIONS_CATALOG.map((p) => p.key);

const EMPLOYEE_DEFAULT_KEYS = new Set([
  "dashboard.view",
  "leads.view",
  "leads.create",
  "leads.edit",
  "leads.export",
  "leads.comment",
  "leads.quote",
  "leads.create_booking",
  "bookings.view",
  "bookings.create",
  "bookings.export",
  "bookings.comment",
  "booking.and.drivers.view",
  "itineraries.view",
  "hotels.view",
  "drivers.and.vehicles.view",
]);

export type MemberRole = "Super Admin" | "Admin" | "Employee";

export function defaultPermissionKeysForRole(role: MemberRole): string[] {
  if (role === "Super Admin") return [...ALL_PERMISSION_KEYS];
  if (role === "Admin") {
    return PERMISSIONS_CATALOG.filter(
      (p) => !(p.module === "Roles & Permissions" && p.action === "delete")
    ).map((p) => p.key);
  }
  return PERMISSIONS_CATALOG.filter((p) => EMPLOYEE_DEFAULT_KEYS.has(p.key)).map((p) => p.key);
}
