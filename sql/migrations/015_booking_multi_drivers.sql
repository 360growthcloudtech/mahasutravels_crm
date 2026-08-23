-- Multi-driver assignments on bookings (primary driver/vehicle columns stay for filters).
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS drivers jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Seed drivers jsonb from legacy single driver/vehicle columns.
UPDATE bookings
SET drivers = jsonb_build_array(
  jsonb_build_object(
    'driver', driver,
    'vehicle', COALESCE(vehicle, '')
  )
)
WHERE trim(COALESCE(driver, '')) <> ''
  AND (drivers IS NULL OR drivers = '[]'::jsonb);

-- Normalize legacy single hotel object into a one-item array.
UPDATE bookings
SET hotel = jsonb_build_array(hotel)
WHERE hotel IS NOT NULL
  AND jsonb_typeof(hotel) = 'object';
