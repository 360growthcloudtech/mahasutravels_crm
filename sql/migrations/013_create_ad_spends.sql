CREATE TABLE IF NOT EXISTS ad_spends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL
    CHECK (platform IN ('Google Ads', 'Meta Ads', 'Website SEO', 'Offline / Print', 'Other')),
  website text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  spend_date date NOT NULL,
  campaign_name text NOT NULL DEFAULT '',
  leads_generated integer NOT NULL DEFAULT 0 CHECK (leads_generated >= 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_spends_platform_idx ON ad_spends (platform);
CREATE INDEX IF NOT EXISTS ad_spends_website_idx ON ad_spends (website);
CREATE INDEX IF NOT EXISTS ad_spends_spend_date_idx ON ad_spends (spend_date DESC);

INSERT INTO ad_spends (
  platform, website, amount, spend_date, campaign_name, leads_generated, notes, created_at
)
SELECT * FROM (
  VALUES
    (
      'Google Ads'::text,
      'mahasutravels.com'::text,
      32000::numeric,
      '2026-08-01'::date,
      'Shimla Manali Summer Search Campaign'::text,
      18,
      'Targeting Delhi NCR & Punjab search terms.'::text,
      '2026-08-01'::timestamptz
    ),
    (
      'Meta Ads',
      'mahasutravels.com',
      22000,
      '2026-08-02',
      'Himachal Family Tour Reels & IG Lead Gen',
      14,
      'Carousel ad featuring Innova Crysta & Tempo Traveller packages.',
      '2026-08-02'
    ),
    (
      'Google Ads',
      'spitivalleytours.com',
      18500,
      '2026-08-03',
      'Spiti & Kinnaur Expedition Search Ads',
      9,
      'High intent adventure keywords.',
      '2026-08-03'
    ),
    (
      'Meta Ads',
      'himachaltaxiservice.in',
      14000,
      '2026-08-04',
      'Chandigarh Pickups & One-way Cab Ads',
      8,
      'FB Lead form targeting weekend travelers.',
      '2026-08-04'
    ),
    (
      'Website SEO',
      'mahasutravels.com',
      8000,
      '2026-08-05',
      'SEO Backlinks & Content Marketing',
      12,
      'Monthly local SEO optimization.',
      '2026-08-05'
    )
) AS seed(
  platform, website, amount, spend_date, campaign_name, leads_generated, notes, created_at
)
WHERE NOT EXISTS (SELECT 1 FROM ad_spends LIMIT 1);
