-- Persisted quote packages per lead (draft/sent).

CREATE TABLE IF NOT EXISTS lead_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Sent')),
  greeting text NOT NULL DEFAULT '',
  intro_text text NOT NULL DEFAULT '',
  company_contact_name text NOT NULL DEFAULT '',
  company_contact_phone text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  duration_label text NOT NULL DEFAULT '',
  vehicle_label text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  amount_note text NOT NULL DEFAULT '',
  inclusions text[] NOT NULL DEFAULT '{}',
  exclusions text[] NOT NULL DEFAULT '{}',
  terms text NOT NULL DEFAULT '',
  guest_name text NOT NULL DEFAULT '',
  guest_phone text NOT NULL DEFAULT '',
  guest_email text NOT NULL DEFAULT '',
  adults int NOT NULL DEFAULT 0,
  kids int NOT NULL DEFAULT 0,
  kids_note text NOT NULL DEFAULT '',
  travel_date date,
  return_date date,
  pickup text NOT NULL DEFAULT '',
  dropoff text NOT NULL DEFAULT '',
  tour_title text NOT NULL DEFAULT '',
  tour_subtitle text NOT NULL DEFAULT '',
  days_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_quotes_lead_id_idx
  ON lead_quotes (lead_id, updated_at DESC);
