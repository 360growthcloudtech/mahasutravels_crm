CREATE SEQUENCE IF NOT EXISTS hotel_templates_hotel_no_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS hotel_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_no integer NOT NULL UNIQUE DEFAULT nextval('hotel_templates_hotel_no_seq'),
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  default_room_type text NOT NULL DEFAULT '',
  typical_rate numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Active', 'Draft', 'Archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hotel_templates_status_idx ON hotel_templates (status);
CREATE INDEX IF NOT EXISTS hotel_templates_city_idx ON hotel_templates (city);
CREATE INDEX IF NOT EXISTS hotel_templates_updated_at_idx ON hotel_templates (updated_at DESC);

INSERT INTO hotel_templates (
  hotel_no, name, city, address, contact_number, default_room_type, typical_rate, notes, status
) VALUES
  (1001, 'Hotel Willow Banks', 'Shimla', 'The Mall, Shimla, HP', '+91 94185 22011', 'Deluxe Mountain View', 3600, 'Preferred Shimla property · ask for Mall-facing rooms', 'Active'),
  (1002, 'Snow Valley Resorts', 'Manali', 'Log Huts Rd, Manali, HP', '+91 98160 44521', 'Family Suite', 7000, 'Good for groups · MAP available', 'Active'),
  (1003, 'Hotel Mount View', 'Dharamshala', 'McLeod Ganj Road, Dharamshala, HP', '+91 1892 221098', 'Standard Twin', 2800, 'Near Dalai Lama temple · walkable market', 'Active'),
  (1004, 'Khajjiar Lake Resort', 'Dalhousie', 'Khajjiar Meadows, Dist. Chamba, HP', '+91 98170 88012', 'Cottage', 4500, 'Seasonal rates · confirm meadow view', 'Draft')
ON CONFLICT (hotel_no) DO NOTHING;

SELECT setval(
  'hotel_templates_hotel_no_seq',
  GREATEST((SELECT COALESCE(MAX(hotel_no), 1000) FROM hotel_templates), 1000)
);
