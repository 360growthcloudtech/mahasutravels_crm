-- Replace website masters with live domains + link leads to itinerary templates.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS itinerary_template_id uuid
    REFERENCES itinerary_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_itinerary_template_id_idx
  ON leads (itinerary_template_id);

-- Clear website values that will no longer exist as active masters.
UPDATE leads
SET website = NULL
WHERE website IS NOT NULL
  AND website NOT IN (
    'mahasutravels.com',
    'himachaltaxitrip.com',
    'himachaltouristcabs.com',
    'himachaltourismcab.com'
  );

INSERT INTO websites (domain, url, label, badge, sort_order, is_active) VALUES
  ('mahasutravels.com', 'https://www.mahasutravels.com/', 'Mahasu Travels', 'Main', 10, true),
  ('himachaltaxitrip.com', 'https://www.himachaltaxitrip.com/', 'Himachal Taxi Trip', 'Taxi', 20, true),
  ('himachaltouristcabs.com', 'https://himachaltouristcabs.com/', 'Himachal Tourist Cabs', 'Cabs', 30, true),
  ('himachaltourismcab.com', 'https://www.himachaltourismcab.com/', 'Himachal Tourism Cab', 'Tourism', 40, true)
ON CONFLICT (domain) DO UPDATE SET
  url = EXCLUDED.url,
  label = EXCLUDED.label,
  badge = EXCLUDED.badge,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

UPDATE websites
SET is_active = false,
    updated_at = now()
WHERE domain NOT IN (
  'mahasutravels.com',
  'himachaltaxitrip.com',
  'himachaltouristcabs.com',
  'himachaltourismcab.com'
);
