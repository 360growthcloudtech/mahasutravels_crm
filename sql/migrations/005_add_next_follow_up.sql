ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS next_follow_up_date date,
  ADD COLUMN IF NOT EXISTS next_follow_up_time time;

CREATE INDEX IF NOT EXISTS leads_next_follow_up_date_idx
  ON leads (next_follow_up_date);
