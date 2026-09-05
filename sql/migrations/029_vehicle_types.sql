-- Vehicle type masters for Drivers & Vehicles form (add / edit / delete).

CREATE TABLE IF NOT EXISTS vehicle_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_types_name_lower_uidx
  ON vehicle_types (lower(name));

INSERT INTO vehicle_types (name, sort_order)
SELECT v.name, v.sort_order
FROM (
  VALUES
    ('Swift Dzire', 10),
    ('Ertiga', 20),
    ('Innova Crysta', 30),
    ('Tempo Traveller', 40),
    ('Sedan', 50),
    ('SUV', 60)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM vehicle_types vt WHERE lower(vt.name) = lower(v.name)
);

-- Import any vehicle types already used on fleet rows.
INSERT INTO vehicle_types (name, sort_order)
SELECT DISTINCT trim(v.vehicle_type) AS name, 100
FROM vehicles v
WHERE trim(COALESCE(v.vehicle_type, '')) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_types vt WHERE lower(vt.name) = lower(trim(v.vehicle_type))
  );
