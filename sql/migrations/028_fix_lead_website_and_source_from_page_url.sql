-- Align stored website + marketing source with the landing/UTM URL.

UPDATE leads l
SET website = w.domain,
    updated_at = now()
FROM websites w
WHERE w.is_active = true
  AND l.page_url IS NOT NULL
  AND NULLIF(TRIM(l.page_url), '') IS NOT NULL
  AND regexp_replace(
    split_part(
      split_part(
        regexp_replace(lower(TRIM(l.page_url)), '^https?://', ''),
        '/',
        1
      ),
      '?',
      1
    ),
    '^www\.',
    ''
  ) = w.domain
  AND l.website IS DISTINCT FROM w.domain;

UPDATE leads
SET source = 'google_ads',
    updated_at = now()
WHERE COALESCE(source, 'website') IN ('website', 'manual')
  AND (
    lower(COALESCE(utm_source, '')) IN ('google', 'google_ads', 'googleads', 'adwords', 'gads')
    OR lower(COALESCE(utm_source, '')) LIKE '%google%'
    OR lower(COALESCE(utm_medium, '')) IN ('cpc', 'ppc', 'paid', 'paid_search', 'sem')
    OR page_url ILIKE '%utm_source=google%'
    OR page_url ILIKE '%gclid=%'
    OR page_url ILIKE '%gad_source=%'
    OR page_url ILIKE '%gad_campaignid=%'
  );

UPDATE leads
SET source = 'meta_ads',
    updated_at = now()
WHERE COALESCE(source, 'website') IN ('website', 'manual')
  AND (
    lower(COALESCE(utm_source, '')) IN (
      'meta', 'meta_ads', 'facebook', 'fb', 'instagram', 'ig', 'paid_social'
    )
    OR lower(COALESCE(utm_source, '')) LIKE '%facebook%'
    OR lower(COALESCE(utm_source, '')) LIKE '%instagram%'
    OR lower(COALESCE(utm_medium, '')) IN ('paid_social', 'social', 'facebook', 'instagram', 'meta')
    OR page_url ILIKE '%utm_source=facebook%'
    OR page_url ILIKE '%utm_source=instagram%'
    OR page_url ILIKE '%utm_source=meta%'
    OR page_url ILIKE '%fbclid=%'
  );
