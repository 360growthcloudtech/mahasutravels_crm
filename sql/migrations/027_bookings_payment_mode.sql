-- How advance/payment was collected on a booking.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT '';
