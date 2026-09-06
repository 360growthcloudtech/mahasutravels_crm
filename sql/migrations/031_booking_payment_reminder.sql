-- Idempotency for 12-hour unpaid balance WhatsApp reminders.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_payment_reminder_due_idx
  ON bookings (travel_date, pickup_time)
  WHERE pickup_time IS NOT NULL
    AND payment_reminder_sent_at IS NULL
    AND balance > 0
    AND status NOT IN ('Cancelled', 'Refunded');
