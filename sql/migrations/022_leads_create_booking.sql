-- Leads: create booking from lead permission

INSERT INTO permissions (key, module, action, label, description, sort_order) VALUES
  ('leads.create_booking', 'Leads', 'create_booking', 'Create Booking from Lead', 'Convert a lead into a booking', 38)
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO user_permissions (user_id, permission_key)
SELECT u.id, p.key
FROM users u
CROSS JOIN permissions p
WHERE u.role IN ('Super Admin', 'Admin')
  AND p.key = 'leads.create_booking'
ON CONFLICT DO NOTHING;

INSERT INTO user_permissions (user_id, permission_key)
SELECT u.id, p.key
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'Employee'
  AND p.key = 'leads.create_booking'
ON CONFLICT DO NOTHING;
