function normalizeWebsiteDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export const MARKETING_SOURCE_CODES = ["google_ads", "meta_ads", "website", "manual"] as const;
export type MarketingSourceCode = (typeof MARKETING_SOURCE_CODES)[number];

export const MARKETING_SOURCE_LABELS: Record<MarketingSourceCode, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  website: "Website",
  manual: "Manual",
};

export type UtmFields = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
};

function cleanParam(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "_");
}

export function parseUtmFromUrl(url: string | null | undefined): UtmFields & { page_url?: string } {
  const raw = cleanParam(url);
  if (!raw) return {};
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const get = (key: string) => parsed.searchParams.get(key)?.trim() || undefined;
    return {
      page_url: parsed.toString(),
      utm_source: get("utm_source"),
      utm_medium: get("utm_medium"),
      utm_campaign: get("utm_campaign"),
      utm_term: get("utm_term"),
      utm_content: get("utm_content"),
    };
  } catch {
    return { page_url: raw };
  }
}

export function mergeUtmFields(input: {
  page_url?: string | null;
  landing_url?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}): UtmFields & { page_url: string } {
  const pageUrl = cleanParam(input.page_url) || cleanParam(input.landing_url);
  const fromUrl = parseUtmFromUrl(pageUrl);
  return {
    page_url: pageUrl || fromUrl.page_url || "",
    utm_source: cleanParam(input.utm_source) || fromUrl.utm_source || "",
    utm_medium: cleanParam(input.utm_medium) || fromUrl.utm_medium || "",
    utm_campaign: cleanParam(input.utm_campaign) || fromUrl.utm_campaign || "",
    utm_term: cleanParam(input.utm_term) || fromUrl.utm_term || "",
    utm_content: cleanParam(input.utm_content) || fromUrl.utm_content || "",
  };
}

const GOOGLE_SOURCES = new Set(["google", "google_ads", "googleads", "adwords", "gads"]);
const META_SOURCES = new Set([
  "meta",
  "meta_ads",
  "facebook",
  "fb",
  "instagram",
  "ig",
  "paid_social",
]);
const GOOGLE_MEDIA = new Set(["cpc", "ppc", "paid", "paid_search", "sem"]);
const META_MEDIA = new Set(["paid_social", "social", "facebook", "instagram", "meta"]);

function urlHasParam(url: string, key: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes(`?${key}=`) ||
    lower.includes(`&${key}=`)
  );
}

function looksLikeGoogleAds(utm: string, medium: string, pageUrl: string): boolean {
  if (GOOGLE_SOURCES.has(utm) || utm.includes("google") || utm.includes("adwords")) return true;
  if (GOOGLE_MEDIA.has(medium) && !looksLikeMetaAds(utm, medium, pageUrl)) return true;
  return (
    urlHasParam(pageUrl, "gclid") ||
    urlHasParam(pageUrl, "gad_source") ||
    urlHasParam(pageUrl, "gad_campaignid") ||
    urlHasParam(pageUrl, "gbraid") ||
    urlHasParam(pageUrl, "wbraid")
  );
}

function looksLikeMetaAds(utm: string, medium: string, pageUrl: string): boolean {
  if (META_SOURCES.has(utm)) return true;
  if (utm.includes("facebook") || utm.includes("instagram") || utm.includes("meta")) return true;
  if (META_MEDIA.has(medium)) return true;
  return urlHasParam(pageUrl, "fbclid") || urlHasParam(pageUrl, "igshid");
}

/**
 * Resolve marketing channel code from UTM / explicit source / CRM actor.
 * - Paid URL signals (gclid, gad_source, fbclid, utm_medium=cpc) win over a blank source
 * - Website forms with no paid signals → website (organic)
 * - CRM session create without paid/UTM signals → manual
 */
export function resolveMarketingSourceCode(input: {
  utm_source?: string | null;
  utm_medium?: string | null;
  page_url?: string | null;
  landing_url?: string | null;
  explicitSource?: string | null;
  /** When true (CRM agent create), empty UTM defaults to manual instead of website */
  fromCrm?: boolean;
}): MarketingSourceCode {
  const merged = mergeUtmFields(input);
  const utm = slug(merged.utm_source || "");
  const medium = slug(merged.utm_medium || "");
  const pageUrl = merged.page_url;

  if (looksLikeGoogleAds(utm, medium, pageUrl)) return "google_ads";
  if (looksLikeMetaAds(utm, medium, pageUrl)) return "meta_ads";
  if (utm === "website" || utm === "organic" || utm === "direct") return "website";
  if (utm === "manual") return "manual";

  const explicit = slug(cleanParam(input.explicitSource));
  if (explicit) {
    if (
      explicit === "google_ads" ||
      explicit === "google-ads" ||
      GOOGLE_SOURCES.has(explicit) ||
      explicit.includes("google")
    ) {
      return "google_ads";
    }
    if (
      explicit === "meta_ads" ||
      explicit === "meta-ads" ||
      META_SOURCES.has(explicit) ||
      explicit.includes("facebook") ||
      explicit.includes("instagram") ||
      explicit.includes("meta")
    ) {
      return "meta_ads";
    }
    if (explicit === "website" || explicit === "organic" || explicit === "web") {
      return "website";
    }
    if (explicit === "manual") return "manual";
    if (
      ["taxi_calculator", "quick_inquiry", "plan_your_trip", "request_callback"].includes(explicit)
    ) {
      return "website";
    }
  }

  if (input.fromCrm) return "manual";
  return "website";
}

/** Hostname from a page/landing URL, without www. */
export function websiteHostFromUrl(url: string | null | undefined): string | null {
  const pageUrl = cleanParam(url);
  if (!pageUrl) return null;
  try {
    const parsed = new URL(pageUrl.includes("://") ? pageUrl : `https://${pageUrl}`);
    return normalizeWebsiteDomain(parsed.hostname) || null;
  } catch {
    const host = normalizeWebsiteDomain(pageUrl);
    return host || null;
  }
}

/**
 * Website domain from explicit field or page URL hostname.
 * Landing-page host wins when both are present — forms often hardcode the wrong website.
 */
export function resolveWebsiteHint(input: {
  website?: string | null;
  page_url?: string | null;
  landing_url?: string | null;
}): string | null {
  const fromUrl = websiteHostFromUrl(cleanParam(input.page_url) || cleanParam(input.landing_url));
  if (fromUrl) return fromUrl;

  const explicit = cleanParam(input.website);
  if (explicit) return normalizeWebsiteDomain(explicit);

  return null;
}

export function isMarketingSourceCode(value: string): value is MarketingSourceCode {
  return (MARKETING_SOURCE_CODES as readonly string[]).includes(value);
}

/** Display attribution from stored fields + landing URL (URL wins when they disagree). */
export function leadAttribution(lead: {
  source?: string | null;
  website?: string | null;
  pageUrl?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
}): { source: MarketingSourceCode; website?: string } {
  const fromCrm = lead.source === "manual";
  return {
    source: resolveMarketingSourceCode({
      utm_source: lead.utmSource,
      utm_medium: lead.utmMedium,
      page_url: lead.pageUrl,
      explicitSource: lead.source,
      fromCrm,
    }),
    website: websiteHostFromUrl(lead.pageUrl) || lead.website || undefined,
  };
}
