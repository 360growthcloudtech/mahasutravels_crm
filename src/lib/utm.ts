import { normalizeWebsiteDomain } from "@/lib/db/masters";

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

/**
 * Resolve marketing channel code from UTM / explicit source / CRM actor.
 * - Website forms with no utm_source → website (organic)
 * - CRM session create without UTM → manual
 */
export function resolveMarketingSourceCode(input: {
  utm_source?: string | null;
  utm_medium?: string | null;
  page_url?: string | null;
  explicitSource?: string | null;
  /** When true (CRM agent create), empty UTM defaults to manual instead of website */
  fromCrm?: boolean;
}): MarketingSourceCode {
  const merged = mergeUtmFields(input);
  const utm = (merged.utm_source || "").toLowerCase().replace(/\s+/g, "_");
  const medium = (merged.utm_medium || "").toLowerCase().replace(/\s+/g, "_");

  if (utm) {
    if (GOOGLE_SOURCES.has(utm) || (utm.includes("google") && medium === "cpc")) {
      return "google_ads";
    }
    if (META_SOURCES.has(utm) || utm.includes("facebook") || utm.includes("instagram")) {
      return "meta_ads";
    }
    if (utm === "website" || utm === "organic" || utm === "direct") {
      return "website";
    }
    if (utm === "manual") return "manual";
  }

  const explicit = cleanParam(input.explicitSource).toLowerCase().replace(/\s+/g, "_");
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
    // Legacy form codes → website (organic) unless CRM manual path
    if (
      ["taxi_calculator", "quick_inquiry", "plan_your_trip", "request_callback"].includes(explicit)
    ) {
      return "website";
    }
  }

  if (input.fromCrm) return "manual";
  return "website";
}

/** Normalize website domain from explicit field or page URL hostname. */
export function resolveWebsiteHint(input: {
  website?: string | null;
  page_url?: string | null;
  landing_url?: string | null;
}): string | null {
  const explicit = cleanParam(input.website);
  if (explicit) return normalizeWebsiteDomain(explicit);

  const pageUrl = cleanParam(input.page_url) || cleanParam(input.landing_url);
  if (!pageUrl) return null;
  try {
    const parsed = new URL(pageUrl.includes("://") ? pageUrl : `https://${pageUrl}`);
    return normalizeWebsiteDomain(parsed.hostname);
  } catch {
    return normalizeWebsiteDomain(pageUrl);
  }
}

export function isMarketingSourceCode(value: string): value is MarketingSourceCode {
  return (MARKETING_SOURCE_CODES as readonly string[]).includes(value);
}
