-- Master permissions catalog + per-user grants

CREATE TABLE IF NOT EXISTS permissions (
  key text PRIMARY KEY,
  module text NOT NULL,
  action text NOT NULL,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS permissions_module_idx ON permissions (module);
CREATE INDEX IF NOT EXISTS permissions_sort_idx ON permissions (sort_order);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS user_permissions_key_idx ON user_permissions (permission_key);

INSERT INTO permissions (key, module, action, label, description, sort_order) VALUES
  ('dashboard.view', 'Dashboard', 'view', 'View Dashboard', 'See CRM overview and KPIs', 0),
  ('leads.view', 'Leads', 'view', 'View Leads', NULL, 2),
  ('leads.create', 'Leads', 'create', 'Create Lead', NULL, 3),
  ('leads.edit', 'Leads', 'edit', 'Edit Lead', NULL, 4),
  ('leads.delete', 'Leads', 'delete', 'Delete Lead', NULL, 5),
  ('leads.assign', 'Leads', 'assign', 'Assign Lead', 'Assign leads to agents', 6),
  ('leads.export', 'Leads', 'export', 'Export Leads', 'Download filtered leads CSV', 7),
  ('bookings.view', 'Bookings', 'view', 'View Bookings', NULL, 8),
  ('bookings.create', 'Bookings', 'create', 'Create Booking', NULL, 9),
  ('bookings.edit', 'Bookings', 'edit', 'Edit Booking', NULL, 10),
  ('bookings.delete', 'Bookings', 'delete', 'Delete Booking', NULL, 11),
  ('bookings.export', 'Bookings', 'export', 'Export Bookings', 'Download filtered bookings CSV', 12),
  ('ad.spend.and.marketing.view', 'Ad Spend & Marketing', 'view', 'View Ad Spend', 'See marketing spend and ROI entries', 13),
  ('ad.spend.and.marketing.create', 'Ad Spend & Marketing', 'create', 'Create Ad Spend', NULL, 14),
  ('ad.spend.and.marketing.edit', 'Ad Spend & Marketing', 'edit', 'Edit Ad Spend', NULL, 15),
  ('ad.spend.and.marketing.delete', 'Ad Spend & Marketing', 'delete', 'Delete Ad Spend', NULL, 16),
  ('booking.and.drivers.view', 'Booking & Drivers', 'view', 'View Assignments', 'See booking-driver mapping', 17),
  ('booking.and.drivers.assign', 'Booking & Drivers', 'assign', 'Assign Driver', 'Assign or reassign drivers to bookings', 18),
  ('itineraries.view', 'Itineraries', 'view', 'View Itineraries', NULL, 19),
  ('itineraries.create', 'Itineraries', 'create', 'Create Itinerary', NULL, 20),
  ('itineraries.edit', 'Itineraries', 'edit', 'Edit Itinerary', NULL, 21),
  ('itineraries.delete', 'Itineraries', 'delete', 'Delete Itinerary', NULL, 22),
  ('hotels.view', 'Hotels', 'view', 'View Hotels', NULL, 23),
  ('hotels.create', 'Hotels', 'create', 'Create Hotel Template', NULL, 24),
  ('hotels.edit', 'Hotels', 'edit', 'Edit Hotel Template', NULL, 25),
  ('hotels.delete', 'Hotels', 'delete', 'Delete Hotel Template', NULL, 26),
  ('drivers.and.vehicles.view', 'Drivers & Vehicles', 'view', 'View Drivers', NULL, 27),
  ('drivers.and.vehicles.create', 'Drivers & Vehicles', 'create', 'Create Driver', NULL, 28),
  ('drivers.and.vehicles.edit', 'Drivers & Vehicles', 'edit', 'Edit Driver', NULL, 29),
  ('drivers.and.vehicles.delete', 'Drivers & Vehicles', 'delete', 'Delete Driver', NULL, 30),
  ('roles.and.permissions.view', 'Roles & Permissions', 'view', 'View Roles', 'See members and system permissions', 31),
  ('roles.and.permissions.create', 'Roles & Permissions', 'create', 'Invite Member', NULL, 32),
  ('roles.and.permissions.edit', 'Roles & Permissions', 'edit', 'Edit Member & Permissions', NULL, 33),
  ('roles.and.permissions.delete', 'Roles & Permissions', 'delete', 'Remove Member', NULL, 34)
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Grant role defaults for keys not already present (does not wipe custom grants).
-- Super Admin: all keys
INSERT INTO user_permissions (user_id, permission_key)
SELECT u.id, p.key
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'Super Admin'
  AND p.is_active = true
ON CONFLICT DO NOTHING;

-- Admin: all except roles.and.permissions.delete
INSERT INTO user_permissions (user_id, permission_key)
SELECT u.id, p.key
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'Admin'
  AND p.is_active = true
  AND p.key <> 'roles.and.permissions.delete'
ON CONFLICT DO NOTHING;

-- Employee: scoped defaults including export
INSERT INTO user_permissions (user_id, permission_key)
SELECT u.id, p.key
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'Employee'
  AND p.is_active = true
  AND p.key IN (
    'dashboard.view',
    'leads.view',
    'leads.create',
    'leads.edit',
    'leads.export',
    'leads.comment',
    'leads.quote',
    'leads.create_booking',
    'bookings.view',
    'bookings.create',
    'bookings.export',
    'bookings.comment',
    'booking.and.drivers.view',
    'itineraries.view',
    'hotels.view',
    'drivers.and.vehicles.view'
  )
ON CONFLICT DO NOTHING;
