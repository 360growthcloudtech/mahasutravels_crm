CREATE SEQUENCE IF NOT EXISTS itinerary_templates_itinerary_no_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS itinerary_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_no integer NOT NULL UNIQUE DEFAULT nextval('itinerary_templates_itinerary_no_seq'),
  name text NOT NULL,
  slug varchar(255) NOT NULL,
  tour_package text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  overview text NOT NULL DEFAULT '',
  inclusions jsonb NOT NULL DEFAULT '[]'::jsonb,
  starting_from numeric NOT NULL DEFAULT 0,
  discount_percentage numeric NOT NULL DEFAULT 0
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  nights varchar(255) NOT NULL DEFAULT '',
  days varchar(255) NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Active', 'Draft', 'Archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS itinerary_templates_slug_uidx ON itinerary_templates (slug);
CREATE INDEX IF NOT EXISTS itinerary_templates_status_idx ON itinerary_templates (status);
CREATE INDEX IF NOT EXISTS itinerary_templates_tour_package_idx ON itinerary_templates (tour_package);
CREATE INDEX IF NOT EXISTS itinerary_templates_updated_at_idx ON itinerary_templates (updated_at DESC);

CREATE TABLE IF NOT EXISTS itinerary_template_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES itinerary_templates(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number >= 1),
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  hotel_id uuid REFERENCES hotel_templates(id) ON DELETE SET NULL,
  hotel_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (itinerary_id, day_number)
);

CREATE INDEX IF NOT EXISTS itinerary_template_days_itinerary_id_idx
  ON itinerary_template_days (itinerary_id);
CREATE INDEX IF NOT EXISTS itinerary_template_days_hotel_id_idx
  ON itinerary_template_days (hotel_id);

INSERT INTO itinerary_templates (
  itinerary_no, name, slug, tour_package, subtitle, overview, inclusions,
  starting_from, discount_percentage, nights, days, status
) VALUES
  (
    1001,
    'Majestic Himachal Tour — Shimla & Manali',
    'majestic-himachal-tour-shimla-manali',
    '5N/6D Shimla Manali Taxi Tour',
    'Queen of Hills to Valley of Gods',
    'A scenic Himalayan journey covering Shimla and Manali with private cab, hotel stays and curated sightseeing. Ideal for families and couples looking for a comfortable hill-station escape.',
    '["Hotel stay","Private cab","Sightseeing","Driver allowance","Toll & parking"]'::jsonb,
    21500, 10, '5', '6', 'Active'
  ),
  (
    1002,
    'Complete Himachal Taxi Tour',
    'complete-himachal-taxi-tour',
    '9N/10D Complete Himachal Taxi Tour',
    'Shimla · Manali · Dharamshala · Dalhousie',
    'An extended Himachal circuit covering the major hill stations with private tempo/cab support — built for groups who want one seamless road trip across the mountains.',
    '["Private cab / tempo","Driver & fuel","Hotel stay support","Sightseeing stops","State taxes"]'::jsonb,
    42000, 5, '9', '10', 'Active'
  ),
  (
    1003,
    'Kinnaur Spiti Taxi Tour',
    'kinnaur-spiti-taxi-tour',
    '9N/10D Kinnaur Spiti Taxi Tour',
    'High-altitude desert & Himalayan villages',
    'A rugged Spiti circuit with private cab for explorers who want monasteries, mountain passes and remote village stays.',
    '["Private cab","Experienced hill driver","Permit support","Flexible sightseeing"]'::jsonb,
    38000, 0, '9', '10', 'Active'
  ),
  (
    1004,
    'Majestic Himachal Tour from Chandigarh',
    'majestic-himachal-tour-from-chandigarh',
    'Custom / Plan your trip',
    '8 Nights / 9 Days · Shimla · Manali · Kasol',
    'Start from Chandigarh and explore Shimla — the Queen of Hills — then Manali, Valley of Gods, and Kasol in Parvati Valley. Built for private cab + hotel packages.',
    '["Hotel","Car / transportation","Sightseeing","Driver allowance","Toll & parking"]'::jsonb,
    21500, 15, '8', '9', 'Active'
  ),
  (
    1005,
    'Custom Himachal Taxi Tour',
    'custom-himachal-taxi-tour',
    'Cab rental only',
    'Tailored itinerary · private cab',
    'A flexible custom tour plan based on preferred pickup, drop and sightseeing notes. Refine with the guest before sending the proposal.',
    '["Private cab","Driver","Fuel","Toll & parking"]'::jsonb,
    8000, 0, '2', '3', 'Draft'
  )
ON CONFLICT (itinerary_no) DO NOTHING;

-- Day plans for seeded templates
INSERT INTO itinerary_template_days (itinerary_id, day_number, title, detail)
SELECT t.id, d.day_number, d.title, d.detail
FROM itinerary_templates t
JOIN (
  VALUES
    (1001, 1, 'Arrival & transfer to Shimla', 'Pickup from airport/railway station. Drive to Shimla (~7–8 hrs). Check-in and evening at Mall Road.'),
    (1001, 2, 'Shimla local sightseeing', 'Full-day tour of Kufri, Jakhoo Temple and Mall Road. Overnight stay in Shimla.'),
    (1001, 3, 'Shimla to Manali via Kullu Valley', 'Scenic drive through Kullu Valley. Optional river rafting stop. Evening arrival and check-in at Manali.'),
    (1001, 4, 'Manali local sightseeing', 'Hadimba Temple, Manu Temple, Vashisht hot springs and Tibetan Monastery. Free evening in Old Manali.'),
    (1001, 5, 'Solang Valley / Rohtang excursion', 'Day trip to Solang Valley (or Rohtang Pass subject to permit/weather). Adventure activities optional.'),
    (1001, 6, 'Departure', 'Checkout after breakfast and drop to Chandigarh / Delhi as per booking.'),
    (1002, 1, 'Pickup & drive to Shimla', 'Morning pickup. Transfer to Shimla with en-route stops. Evening leisure.'),
    (1002, 2, 'Shimla sightseeing', 'Kufri, Mall Road and Jakhoo. Overnight Shimla.'),
    (1002, 3, 'Shimla to Manali', 'Drive via Kullu Valley. Check-in Manali.'),
    (1002, 4, 'Manali local', 'Hadimba, Vashisht and Old Manali cafes.'),
    (1002, 5, 'Solang / Rohtang day', 'Adventure valley day trip. Return overnight Manali.'),
    (1002, 6, 'Manali to Dharamshala', 'Long scenic transfer to McLeod Ganj / Dharamshala.'),
    (1002, 7, 'Dharamshala sightseeing', 'Dalai Lama Temple, Bhagsu waterfall and local markets.'),
    (1002, 8, 'Dharamshala to Dalhousie', 'Transfer to Dalhousie. Evening stroll.'),
    (1002, 9, 'Dalhousie & Khajjiar', 'Khajjiar lake day trip — mini Switzerland of India.'),
    (1002, 10, 'Departure', 'Checkout and drop to Chandigarh / Pathankot / Delhi.'),
    (1003, 1, 'Delhi / Chandigarh to Shimla', 'Start of the Spiti approach via Shimla.'),
    (1003, 2, 'Shimla to Sangla / Kalpa', 'Enter Kinnaur. Overnight in Kalpa or Sangla.'),
    (1003, 3, 'Kalpa to Nako / Tabo', 'Cross into Spiti valley with monastery stops.'),
    (1003, 4, 'Tabo to Kaza', 'Arrive Kaza — base for Spiti exploration.'),
    (1003, 5, 'Kaza local & Key Monastery', 'Key Gompa, Kibber and Chicham bridge.'),
    (1003, 6, 'Pin Valley / Dhankar', 'Optional Pin Valley or Dhankar monastery day.'),
    (1003, 7, 'Kaza to Chandratal / Manali route', 'High-pass transfer weather permitting.'),
    (1003, 8, 'Buffer / sightseeing day', 'Flexible day for weather or rest.'),
    (1003, 9, 'Return toward Manali / Shimla', 'Begin descent toward the plains.'),
    (1003, 10, 'Drop to Chandigarh / Delhi', 'Final transfer and trip close.'),
    (1004, 1, 'Arrival at Chandigarh, transfer to Shimla', 'Meet & greet at Chandigarh. Scenic drive to Shimla. Evening free at Mall Road.'),
    (1004, 2, 'Shimla local sightseeing', 'Kufri, Mall Road and Jakhoo Temple. Overnight Shimla.'),
    (1004, 3, 'Shimla to Manali via Kullu Valley', 'Drive through pine forests and Kullu Valley. Evening Manali check-in.'),
    (1004, 4, 'Manali local sightseeing', 'Hadimba Temple, Vashisht hot springs and local markets.'),
    (1004, 5, 'Solang Valley / Rohtang Pass excursion', 'Snow & adventure day (permit/weather dependent).'),
    (1004, 6, 'Manali to Kasol (Parvati Valley)', 'Transfer to Kasol. Evening cafes and riverside walk.'),
    (1004, 7, 'Kasol sightseeing and trekking', 'Optional Manikaran visit or short trek nearby.'),
    (1004, 8, 'Departure from Kasol to Chandigarh', 'Drive back toward Chandigarh with photo stops.'),
    (1004, 9, 'Drop & tour ends', 'Final drop at Chandigarh airport/railway station.'),
    (1005, 1, 'Pickup & start of tour', 'Cab report at pickup point. Drive as per agreed plan.'),
    (1005, 2, 'Sightseeing day', 'Full day at disposal for local sightseeing and leisure.'),
    (1005, 3, 'Return & drop', 'Checkout transfer and drop at agreed point.')
) AS d(itinerary_no, day_number, title, detail)
  ON t.itinerary_no = d.itinerary_no
ON CONFLICT (itinerary_id, day_number) DO NOTHING;

SELECT setval(
  'itinerary_templates_itinerary_no_seq',
  GREATEST((SELECT COALESCE(MAX(itinerary_no), 1000) FROM itinerary_templates), 1000)
);
