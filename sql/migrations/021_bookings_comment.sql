-- Bookings: comment permission

INSERT INTO permissions (key, module, action, label, description, sort_order) VALUES
  ('bookings.comment', 'Bookings', 'comment', 'Comment on Booking', 'View and add notes on bookings', 37)
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
  AND p.key = 'bookings.comment'
ON CONFLICT DO NOTHING;

INSERT INTO user_permissions (user_id, permission_key)
SELECT u.id, p.key
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'Employee'
  AND p.key = 'bookings.comment'
ON CONFLICT DO NOTHING;
