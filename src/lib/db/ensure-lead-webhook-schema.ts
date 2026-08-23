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
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS auto_assign_website text
  `);
  try {
    await query(`
      DO $$ BEGIN
        ALTER TABLE users
          ADD CONSTRAINT users_auto_assign_website_fkey
          FOREIGN KEY (auto_assign_website) REFERENCES websites(domain) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  } catch {
    /* already constrained */
  }
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_auto_assign_website_uidx
      ON users (auto_assign_website)
      WHERE auto_assign_website IS NOT NULL
  `);
  ensured = true;
}
