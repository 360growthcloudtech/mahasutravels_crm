CREATE TABLE IF NOT EXISTS lead_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_statuses_one_default_idx
  ON lead_statuses (is_default)
  WHERE is_default;

CREATE TABLE IF NOT EXISTS lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  url text NOT NULL,
  label text NOT NULL,
  badge text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO lead_statuses (code, label, is_closed, is_default, sort_order) VALUES
  ('New', 'New', false, true, 10),
  ('Contacted', 'Contacted', false, false, 20),
  ('Quoted', 'Quoted', false, false, 30),
  ('Follow-up', 'Follow-up', false, false, 40),
  ('Confirmed', 'Confirmed', true, false, 50),
  ('Lost', 'Lost', true, false, 60)
ON CONFLICT (code) DO NOTHING;

INSERT INTO lead_sources (code, label, sort_order) VALUES
  ('taxi_calculator', 'Taxi Calculator', 10),
  ('quick_inquiry', 'Quick Inquiry', 20),
  ('plan_your_trip', 'Plan Your Trip', 30),
  ('request_callback', 'Request Callback', 40),
  ('manual', 'Manual', 50)
ON CONFLICT (code) DO NOTHING;

INSERT INTO websites (domain, url, label, badge, sort_order) VALUES
  ('mahasutravels.com', 'https://mahasutravels.com', 'Mahasu Main Portal', 'Main', 10),
  ('himachaltaxiservice.in', 'https://himachaltaxiservice.in', 'Himachal Taxi Service', 'Cab Rentals', 20),
  ('spitivalleytours.com', 'https://spitivalleytours.com', 'Spiti Valley Tours', 'Expeditions', 30),
  ('shimlamanalicabs.com', 'https://shimlamanalicabs.com', 'Shimla Manali Cabs', 'Packages', 40),
  ('lehladakhcabs.in', 'https://lehladakhcabs.in', 'Leh Ladakh Cabs', 'Luxury Fleet', 50)
ON CONFLICT (domain) DO NOTHING;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_status_fkey
  FOREIGN KEY (status) REFERENCES lead_statuses(code);

ALTER TABLE leads
  ADD CONSTRAINT leads_source_fkey
  FOREIGN KEY (source) REFERENCES lead_sources(code);

ALTER TABLE leads
  ADD CONSTRAINT leads_website_fkey
  FOREIGN KEY (website) REFERENCES websites(domain);
