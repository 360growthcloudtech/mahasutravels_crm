-- Remap lead statuses to: New Lead, Cold, Hot, Lost, Booked

-- 1. Insert new status codes (keep old ones temporarily for FK-safe remapping)
INSERT INTO lead_statuses (code, label, is_closed, is_default, sort_order) VALUES
  ('New Lead', 'New Lead', false, false, 10),
  ('Cold', 'Cold', false, false, 20),
  ('Hot', 'Hot', false, false, 30),
  ('Booked', 'Booked', true, false, 50)
ON CONFLICT (code) DO NOTHING;

-- Ensure Lost exists with closed flag
INSERT INTO lead_statuses (code, label, is_closed, is_default, sort_order) VALUES
  ('Lost', 'Lost', true, false, 40)
ON CONFLICT (code) DO UPDATE
  SET label = EXCLUDED.label,
      is_closed = EXCLUDED.is_closed,
      sort_order = EXCLUDED.sort_order,
      is_active = true,
      updated_at = now();

-- 2. Drop unique index that references old closed statuses
DROP INDEX IF EXISTS leads_one_open_per_phone;

-- 3. Remap existing lead rows
UPDATE leads SET status = 'New Lead' WHERE status = 'New';
UPDATE leads SET status = 'Cold' WHERE status = 'Contacted';
UPDATE leads SET status = 'Hot' WHERE status IN ('Quoted', 'Follow-up');
UPDATE leads SET status = 'Booked' WHERE status = 'Confirmed';

-- 4. Clear default flag before switching default
UPDATE lead_statuses SET is_default = false WHERE is_default = true;

-- 5. Activate / configure new statuses
UPDATE lead_statuses SET
  label = 'New Lead',
  is_closed = false,
  is_default = true,
  sort_order = 10,
  is_active = true,
  updated_at = now()
WHERE code = 'New Lead';

UPDATE lead_statuses SET
  label = 'Cold',
  is_closed = false,
  is_default = false,
  sort_order = 20,
  is_active = true,
  updated_at = now()
WHERE code = 'Cold';

UPDATE lead_statuses SET
  label = 'Hot',
  is_closed = false,
  is_default = false,
  sort_order = 30,
  is_active = true,
  updated_at = now()
WHERE code = 'Hot';

UPDATE lead_statuses SET
  label = 'Lost',
  is_closed = true,
  is_default = false,
  sort_order = 40,
  is_active = true,
  updated_at = now()
WHERE code = 'Lost';

UPDATE lead_statuses SET
  label = 'Booked',
  is_closed = true,
  is_default = false,
  sort_order = 50,
  is_active = true,
  updated_at = now()
WHERE code = 'Booked';

-- 6. Remove legacy status codes
DELETE FROM lead_statuses
WHERE code IN ('New', 'Contacted', 'Quoted', 'Follow-up', 'Confirmed');

-- 7. Recreate unique open-phone index with new closed statuses
CREATE UNIQUE INDEX IF NOT EXISTS leads_one_open_per_phone
  ON leads (phone_normalized)
  WHERE status NOT IN ('Lost', 'Booked') AND phone_normalized <> '';

-- 8. Align default column default (if still present from older schema)
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'New Lead';
