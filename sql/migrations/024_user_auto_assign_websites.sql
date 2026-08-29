-- Many-to-many: users can be mapped to multiple websites for auto-assign.

CREATE TABLE IF NOT EXISTS user_auto_assign_websites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  website_domain text NOT NULL REFERENCES websites(domain) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, website_domain)
);

CREATE INDEX IF NOT EXISTS user_auto_assign_websites_domain_idx
  ON user_auto_assign_websites (website_domain);

-- Migrate legacy single column when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'auto_assign_website'
  ) THEN
    INSERT INTO user_auto_assign_websites (user_id, website_domain)
    SELECT id, auto_assign_website
    FROM users
    WHERE auto_assign_website IS NOT NULL
    ON CONFLICT DO NOTHING;

    DROP INDEX IF EXISTS users_auto_assign_website_uidx;
    DROP INDEX IF EXISTS users_auto_assign_website_active_idx;
    ALTER TABLE users DROP COLUMN auto_assign_website;
  END IF;
END $$;
