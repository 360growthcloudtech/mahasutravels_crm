-- Lead car picker uses vehicles table, not a separate lead_cars master.

DROP TABLE IF EXISTS lead_cars;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_vehicle_id_idx ON leads (vehicle_id);
