-- Dynamic hotel details & rates on lead quotes.

ALTER TABLE lead_quotes
  ADD COLUMN IF NOT EXISTS hotels_json jsonb NOT NULL DEFAULT '[]'::jsonb;
