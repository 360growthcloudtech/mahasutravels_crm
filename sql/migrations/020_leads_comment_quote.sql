-- Leads: comment + send quote permissions

INSERT INTO permissions (key, module, action, label, description, sort_order) VALUES
  ('leads.comment', 'Leads', 'comment', 'Comment on Lead', 'View and add notes on leads', 35),
  ('leads.quote', 'Leads', 'quote', 'Send Quote', 'Build and send quotes for leads', 36)
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Super Admin + Admin: grant new keys
INSERT INTO user_permissions (user_id, permission_key)
SELECT u.id, p.key
FROM users u
CROSS JOIN permissions p
WHERE u.role IN ('Super Admin', 'Admin')
  AND p.key IN ('leads.comment', 'leads.quote')
ON CONFLICT DO NOTHING;

-- Employee defaults
INSERT INTO user_permissions (user_id, permission_key)
SELECT u.id, p.key
FROM users u
CROSS JOIN permissions p
WHERE u.role = 'Employee'
  AND p.key IN ('leads.comment', 'leads.quote')
ON CONFLICT DO NOTHING;
