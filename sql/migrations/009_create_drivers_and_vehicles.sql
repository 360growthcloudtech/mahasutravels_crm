CREATE SEQUENCE IF NOT EXISTS drivers_driver_no_seq START WITH 11;

CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_no integer NOT NULL UNIQUE DEFAULT nextval('drivers_driver_no_seq'),
  name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL DEFAULT '',
  license_number text NOT NULL DEFAULT '',
  license_expiry date,
  status text NOT NULL DEFAULT 'Approved'
    CHECK (status IN ('Approved', 'Rejected', 'Deactivated')),
  rating numeric NOT NULL DEFAULT 5
    CHECK (rating >= 0 AND rating <= 5),
  trips integer NOT NULL DEFAULT 0
    CHECK (trips >= 0),
  vendor boolean NOT NULL DEFAULT false,
  documents_verified boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drivers_status_idx ON drivers (status);
CREATE INDEX IF NOT EXISTS drivers_phone_idx ON drivers (phone);
CREATE INDEX IF NOT EXISTS drivers_updated_at_idx ON drivers (updated_at DESC);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
  registration_number text NOT NULL,
  vehicle_type text NOT NULL,
  capacity integer NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  fuel_type text NOT NULL DEFAULT ''
    CHECK (fuel_type IN ('', 'Petrol', 'Diesel', 'CNG', 'Electric')),
  rc_number text NOT NULL DEFAULT '',
  insurance_expiry date,
  pollution_expiry date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_registration_number_uidx
  ON vehicles (lower(registration_number));
CREATE INDEX IF NOT EXISTS vehicles_vehicle_type_idx ON vehicles (vehicle_type);

INSERT INTO drivers (
  driver_no, name, phone, address, license_number, license_expiry,
  status, rating, trips, vendor, documents_verified, notes
) VALUES
  (11, 'Suresh Thakur', '+91 94180 22110', 'Sanjauli, Shimla, HP', 'HP0120210004521', '2028-04-12',
   'Approved', 4.8, 214, false, true, ''),
  (12, 'Vinod Kumar', '+91 98051 34210', 'Sector 22, Chandigarh', 'HR2620190009981', '2026-11-02',
   'Approved', 4.6, 152, false, true, ''),
  (13, 'Rakesh Negi', '+91 90154 88231', 'Kasauli Road, Solan, HP', 'HP0820180002210', '2027-06-18',
   'Approved', 4.9, 301, false, true, ''),
  (14, 'Deepak Chand', '+91 88172 09441', 'Kullu, HP', 'HP6420170001187', '2025-08-21',
   'Approved', 4.7, 98, false, true, ''),
  (15, 'Mohit Sharma', '+91 97290 11023', 'Vendor fleet · Zirakpur, PB', 'PB6520190007712', '2027-02-14',
   'Rejected', 4.5, 76, true, false, 'Pending updated insurance copy'),
  (16, 'Ajay Bisht', '+91 96201 44982', 'Vendor fleet · Kalka, HR', 'HP3320180005510', '2028-01-09',
   'Deactivated', 4.8, 189, true, true, '')
ON CONFLICT (driver_no) DO NOTHING;

INSERT INTO vehicles (
  driver_id, registration_number, vehicle_type, capacity, fuel_type,
  rc_number, insurance_expiry, pollution_expiry
)
SELECT d.id, v.registration_number, v.vehicle_type, v.capacity, v.fuel_type,
       v.rc_number, v.insurance_expiry::date, NULLIF(v.pollution_expiry, '')::date
FROM drivers d
JOIN (
  VALUES
    (11, 'HP-01-4521', 'Innova Crysta', 7, 'Diesel', 'HP01AB4521', '2027-01-15', '2026-10-20'),
    (12, 'HR-26-9981', 'Ertiga', 6, 'Petrol', 'HR26CD9981', '2026-09-30', '2026-08-15'),
    (13, 'HP-08-2210', 'Swift Dzire', 4, 'Diesel', 'HP08EF2210', '2026-12-05', ''),
    (14, 'HP-64-1187', 'Tempo Traveller', 14, 'Diesel', 'HP64GH1187', '2026-03-11', '2026-11-01'),
    (15, 'PB-65-7712', 'Innova Crysta', 7, 'Diesel', 'PB65JK7712', '2026-07-20', ''),
    (16, 'HP-33-5510', 'Tempo Traveller', 14, 'Diesel', 'HP33LM5510', '2027-05-17', '2027-02-28')
) AS v(driver_no, registration_number, vehicle_type, capacity, fuel_type, rc_number, insurance_expiry, pollution_expiry)
  ON d.driver_no = v.driver_no
WHERE NOT EXISTS (
  SELECT 1 FROM vehicles existing WHERE existing.driver_id = d.id
);

SELECT setval(
  'drivers_driver_no_seq',
  GREATEST((SELECT COALESCE(MAX(driver_no), 10) FROM drivers), 10)
);
