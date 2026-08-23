-- Lead form car / cab fleet masters (calculator categories + website fleet).

CREATE TABLE IF NOT EXISTS lead_cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  seats text NOT NULL DEFAULT '',
  rate_per_day numeric(12, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO lead_cars (code, label, seats, rate_per_day, sort_order) VALUES
  ('sedan', 'Sedan', '4+1', 2100, 10),
  ('suv', 'SUV', '6+1', 2800, 20),
  ('innova', 'Innova', '7+1', 4000, 30),
  ('alto-800-4-1', 'Alto 800 (4+1)', '4+1', 2000, 40),
  ('maruti-dezire-4-1', 'Maruti Dezire (4+1)', '4+1', 2100, 50),
  ('honda-amaze-4-1', 'Honda Amaze (4+1)', '4+1', 2100, 60),
  ('toyota-etios-4-1', 'Toyota Etios (4+1)', '4+1', 2100, 70),
  ('ertiga-6-1', 'Ertiga (6+1)', '6+1', 2800, 80),
  ('toyota-innova-7-1', 'Toyota Innova (7+1)', '7+1', 3200, 90),
  ('innova-crysta-7-1', 'Innova CRYSTA (7+1)', '7+1', 4000, 100),
  ('mahindra-xylo-6-1', 'Mahindra Xylo (6+1)', '6+1', 3200, 110),
  ('tavera-7-1', 'Tavera (7+1)', '7+1', 3200, 120),
  ('tempo-traveller-12-1', 'Tempo Traveller (12+1)', '12+1', 4200, 130),
  ('tempo-traveller-17-1', 'Tempo Traveller (17+1)', '17+1', 5200, 140),
  ('luxury-tempo-traveller-10-1', 'Luxury Tempo Traveller (10+1)', '10+1', 5500, 150),
  ('urbania-tempo-traveller-10-1', 'Urbania Tempo Traveller (10+1)', '10+1', 6000, 160)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  seats = EXCLUDED.seats,
  rate_per_day = EXCLUDED.rate_per_day,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();
