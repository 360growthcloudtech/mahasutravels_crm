CREATE SEQUENCE IF NOT EXISTS leads_lead_no_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_no integer NOT NULL UNIQUE DEFAULT nextval('leads_lead_no_seq'),
  name text NOT NULL,
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  email text NOT NULL DEFAULT '',
  pickup text NOT NULL DEFAULT '',
  drop_location text NOT NULL DEFAULT '',
  car text NOT NULL DEFAULT '',
  days integer NOT NULL DEFAULT 0,
  pickup_date date,
  drop_date date,
  price numeric NOT NULL DEFAULT 0,
  source text NOT NULL,
  city text NOT NULL DEFAULT '',
  website text,
  tour_package text NOT NULL DEFAULT '',
  adults integer NOT NULL DEFAULT 0,
  kids integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'New'
    CHECK (status IN ('New', 'Contacted', 'Quoted', 'Follow-up', 'Confirmed', 'Lost')),
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  inquiry_count integer NOT NULL DEFAULT 1,
  previous_lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_inquiry_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_phone_normalized_idx ON leads (phone_normalized);
CREATE UNIQUE INDEX IF NOT EXISTS leads_one_open_per_phone
  ON leads (phone_normalized)
  WHERE status NOT IN ('Confirmed', 'Lost') AND phone_normalized <> '';
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads (source);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads (assigned_to);
CREATE INDEX IF NOT EXISTS leads_website_idx ON leads (website);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);

CREATE TABLE IF NOT EXISTS lead_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_comments_lead_id_idx ON lead_comments (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  action text NOT NULL,
  label text NOT NULL,
  detail text,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_activity_lead_id_idx ON lead_activity (lead_id, created_at DESC);
