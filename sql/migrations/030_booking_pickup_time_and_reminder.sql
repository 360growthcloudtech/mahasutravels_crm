-- Pickup/start time for 3-hour trip reminders + send idempotency.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pickup_time time;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS trip_reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_trip_reminder_due_idx
  ON bookings (travel_date, pickup_time)
  WHERE pickup_time IS NOT NULL
    AND trip_reminder_sent_at IS NULL
    AND status NOT IN ('Cancelled', 'Refunded');
