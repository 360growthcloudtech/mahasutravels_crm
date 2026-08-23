-- Marketing-channel sources + UTM attribution fields on leads.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS page_url text,
  ADD COLUMN IF NOT EXISTS form_type text;

INSERT INTO lead_sources (code, label, sort_order, is_active) VALUES
  ('google_ads', 'Google Ads', 10, true),
  ('meta_ads', 'Meta Ads', 20, true),
  ('website', 'Website', 30, true),
  ('manual', 'Manual', 40, true)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

-- Preserve old form codes on form_type, then remap marketing source.
UPDATE leads
SET form_type = COALESCE(NULLIF(TRIM(form_type), ''), source)
WHERE form_type IS NULL
  AND source IN (
    'taxi_calculator',
    'quick_inquiry',
    'plan_your_trip',
    'request_callback',
    'manual'
  );

UPDATE leads
SET source = CASE
  WHEN source = 'manual' THEN 'manual'
  WHEN source IN ('google_ads', 'meta_ads', 'website') THEN source
  ELSE 'website'
END;

UPDATE lead_sources
SET is_active = false,
    updated_at = now()
WHERE code IN (
  'taxi_calculator',
  'quick_inquiry',
  'plan_your_trip',
  'request_callback'
);

UPDATE lead_sources
SET sort_order = 40,
    label = 'Manual',
    is_active = true,
    updated_at = now()
WHERE code = 'manual';
