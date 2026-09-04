import type { IngestLeadInput } from "@/lib/db/leads";
import {
  CALCULATOR_CARS,
  normalizePhone,
  parseLeadDate,
  parseLeadTime,
} from "@/lib/lead-utils";
import { mergeUtmFields, resolveMarketingSourceCode, resolveWebsiteHint } from "@/lib/utm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LEGACY_FORM_CODES = [
  "taxi_calculator",
  "quick_inquiry",
  "plan_your_trip",
  "request_callback",
  "enquire_now",
  "contact",
  "cab_booking",
  "taxi_booking",
] as const;

function readString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  // Form plugins often send phone/numeric fields as JSON numbers.
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/** First non-empty string among canonical key and aliases. */
function pickString(body: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = readString(body[key])?.trim();
    if (v) return v;
  }
  return "";
}

function pickNumber(body: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = readNumber(body[key]);
    if (v !== undefined) return v;
  }
  return undefined;
}

function pickDateRaw(body: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      return body[key];
    }
  }
  return undefined;
}

function buildNotes(body: Record<string, unknown>): string {
  const notes = pickString(body, ["notes"]);
  const subject = pickString(body, ["subject"]);
  const message = pickString(body, ["message"]);
  const direction = pickString(body, ["direction", "trip_direction"]);

  const parts: string[] = [];
  if (notes) parts.push(notes);
  if (subject && message) {
    parts.push(`Subject: ${subject}`, message);
  } else if (subject) {
    parts.push(`Subject: ${subject}`);
  } else if (message) {
    parts.push(message);
  }
  if (direction) parts.push(`Direction: ${direction}`);
  return parts.join("\n").trim();
}

export type ParseIngestOptions = {
  /** Webhook: aliases + phone-or-email. CRM: name + phone required. */
  mode: "crm" | "webhook";
};

export function parseLeadIngestBody(
  body: Record<string, unknown>,
  options: ParseIngestOptions
): { ok: true; input: IngestLeadInput } | { ok: false; error: string } {
  const isWebhook = options.mode === "webhook";

  const nameRaw = pickString(body, ["name", "full_name", "your_name"]);
  const phone = pickString(body, [
    "phone",
    "phone_no",
    "phone_number",
    "mobile",
    "mobile_number",
  ]);
  const email = pickString(body, ["email", "email_id", "email_address"]);

  if (isWebhook) {
    if (!phone && !email) {
      return { ok: false, error: "phone or email is required" };
    }
  } else {
    if (!nameRaw) return { ok: false, error: "name is required" };
    if (!phone) return { ok: false, error: "phone is required" };
  }

  const name = nameRaw || (isWebhook ? "Website lead" : "");

  if (phone) {
    const phoneNormalized = normalizePhone(phone);
    if (phoneNormalized.length < 10) {
      return { ok: false, error: "phone must have at least 10 digits" };
    }
  }

  const pageUrlRaw =
    pickString(body, ["page_url", "landing_url", "url"]) ||
    readString(body.landing_url)?.trim() ||
    "";
  const utm = mergeUtmFields({
    page_url: pageUrlRaw,
    landing_url: readString(body.landing_url),
    utm_source: readString(body.utm_source),
    utm_medium: readString(body.utm_medium),
    utm_campaign: readString(body.utm_campaign),
    utm_term: readString(body.utm_term),
    utm_content: readString(body.utm_content),
  });

  const explicitSource = readString(body.source)?.trim() ?? "";
  const formTypeRaw =
    pickString(body, ["form_type"]) ||
    (LEGACY_FORM_CODES.includes(explicitSource as (typeof LEGACY_FORM_CODES)[number])
      ? explicitSource
      : "");

  const car = pickString(body, ["car", "cab", "select_cab", "vehicle", "cab_type"]);

  // CRM + legacy calculator still validates known car codes; webhook accepts free-text cab names.
  if (!isWebhook && formTypeRaw === "taxi_calculator") {
    const carCode = car.toLowerCase();
    if (carCode && !(CALCULATOR_CARS as readonly string[]).includes(carCode)) {
      return { ok: false, error: "car must be sedan, suv, or innova" };
    }
  }

  const fromCrm = options.mode === "crm";
  const source = resolveMarketingSourceCode({
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    page_url: utm.page_url || pageUrlRaw,
    landing_url: readString(body.landing_url),
    explicitSource: explicitSource || undefined,
    fromCrm,
  });

  const websiteHint =
    resolveWebsiteHint({
      website: pickString(body, ["website"]) || null,
      page_url: utm.page_url || pageUrlRaw,
      landing_url: readString(body.landing_url),
    }) || null;

  const pickupDateRaw = pickDateRaw(body, ["pickup_date", "travel_date", "pick_up_date"]);
  const dropDateRaw = pickDateRaw(body, ["drop_date", "drop_off_date"]);
  const pickupDate = pickupDateRaw !== undefined ? parseLeadDate(pickupDateRaw) : null;
  const dropDate = dropDateRaw !== undefined ? parseLeadDate(dropDateRaw) : null;
  // Webhook: never reject the whole lead over a bad date — store null instead.
  if (pickupDateRaw !== undefined && !pickupDate && !isWebhook) {
    return { ok: false, error: "pickup_date is invalid" };
  }
  if (dropDateRaw !== undefined && !dropDate && !isWebhook) {
    return { ok: false, error: "drop_date is invalid" };
  }

  const followUpDate =
    body.next_follow_up_date === null || body.next_follow_up_date === ""
      ? null
      : parseLeadDate(body.next_follow_up_date);
  const followUpTime =
    body.next_follow_up_time === null || body.next_follow_up_time === ""
      ? null
      : parseLeadTime(body.next_follow_up_time);
  if (
    body.next_follow_up_date &&
    body.next_follow_up_date !== null &&
    !followUpDate &&
    !isWebhook
  ) {
    return { ok: false, error: "next_follow_up_date is invalid" };
  }
  if (
    body.next_follow_up_time &&
    body.next_follow_up_time !== null &&
    !followUpTime &&
    !isWebhook
  ) {
    return { ok: false, error: "next_follow_up_time is invalid" };
  }

  const assignedTo = readString(body.assigned_to)?.trim() || undefined;
  const rawItineraryId = readString(body.itinerary_template_id)?.trim() || null;
  if (rawItineraryId && !UUID_RE.test(rawItineraryId)) {
    return { ok: false, error: "itinerary_template_id is invalid" };
  }
  const rawVehicleId = readString(body.vehicle_id)?.trim() || null;
  if (rawVehicleId && !UUID_RE.test(rawVehicleId)) {
    return { ok: false, error: "vehicle_id is invalid" };
  }

  const adults =
    pickNumber(body, [
      "adults",
      "no_of_persons",
      "persons",
      "passengers",
      "no_of_passengers",
    ]) ?? 0;
  const kids = pickNumber(body, ["kids", "children"]) ?? 0;
  const days = pickNumber(body, ["days", "no_of_days", "number_of_days"]) ?? 0;

  return {
    ok: true,
    input: {
      name,
      phone: phone || "",
      email,
      pickup: pickString(body, ["pickup", "pickup_location", "pick_up_location", "location"]),
      drop: pickString(body, [
        "drop",
        "drop_location",
        "dropoff",
        "drop_off_location",
        "dropoff_location",
      ]),
      car,
      days,
      pickup_date: pickupDate,
      drop_date: dropDate,
      next_follow_up_date: followUpDate,
      next_follow_up_time: followUpTime,
      price: readNumber(body.price) ?? 0,
      source,
      city: pickString(body, ["city"]),
      website: websiteHint,
      tour_package: pickString(body, [
        "tour_package",
        "tour_packages",
        "package",
        "destination",
      ]),
      itinerary_template_id: rawItineraryId,
      vehicle_id: rawVehicleId,
      adults,
      kids,
      notes: buildNotes(body),
      status: typeof body.status === "string" ? body.status : undefined,
      assigned_to: assignedTo ?? null,
      utm_source: utm.utm_source || null,
      utm_medium: utm.utm_medium || null,
      utm_campaign: utm.utm_campaign || null,
      utm_term: utm.utm_term || null,
      utm_content: utm.utm_content || null,
      page_url: utm.page_url || null,
      form_type: formTypeRaw || null,
    },
  };
}
