import { query } from "@/lib/db";

let ensured = false;

/** Idempotent schema bits required by the multi-site lead webhook + auto-assign. */
export async function ensureLeadWebhookSchema() {
  if (ensured) return;
  await query(`
    ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS utm_source text,
      ADD COLUMN IF NOT EXISTS utm_medium text,
      ADD COLUMN IF NOT EXISTS utm_campaign text,
      ADD COLUMN IF NOT EXISTS utm_term text,
      ADD COLUMN IF NOT EXISTS utm_content text,
      ADD COLUMN IF NOT EXISTS page_url text,
      ADD COLUMN IF NOT EXISTS form_type text
  `);
  await query(`
    INSERT INTO lead_sources (code, label, sort_order, is_active) VALUES
      ('google_ads', 'Google Ads', 10, true),
      ('meta_ads', 'Meta Ads', 20, true),
      ('website', 'Website', 30, true),
      ('manual', 'Manual', 40, true)
    ON CONFLICT (code) DO UPDATE SET
      label = EXCLUDED.label,
      sort_order = EXCLUDED.sort_order,
      is_active = true,
      updated_at = now()
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS user_auto_assign_websites (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      website_domain text NOT NULL REFERENCES websites(domain) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, website_domain)
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS user_auto_assign_websites_domain_idx
      ON user_auto_assign_websites (website_domain)
  `);
  // One-time migrate from legacy column if it still exists.
  await query(`
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
    END $$
  `);
  ensured = true;
}
