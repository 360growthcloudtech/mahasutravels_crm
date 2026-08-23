-- Remove unused dashboard.export (no dashboard export UI)

DELETE FROM user_permissions WHERE permission_key = 'dashboard.export';
DELETE FROM permissions WHERE key = 'dashboard.export';
