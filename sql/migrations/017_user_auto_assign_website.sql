-- Optional website domain for auto-assigning inbound leads to a user.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auto_assign_website text
    REFERENCES websites(domain) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_auto_assign_website_uidx
  ON users (auto_assign_website)
  WHERE auto_assign_website IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_auto_assign_website_active_idx
  ON users (auto_assign_website)
  WHERE auto_assign_website IS NOT NULL AND status = 'Active';
