-- Persist spend time on ad spend entries (date already stored on spend_date).

ALTER TABLE ad_spends
  ADD COLUMN IF NOT EXISTS spend_time time;

UPDATE ad_spends
SET spend_time = COALESCE(spend_time, created_at::time, '00:00:00'::time)
WHERE spend_time IS NULL;

ALTER TABLE ad_spends
  ALTER COLUMN spend_time SET DEFAULT '00:00:00'::time,
  ALTER COLUMN spend_time SET NOT NULL;
