export const LEAD_STATUSES = [
  "New Lead",
  "Cold",
  "Hot",
  "Lost",
  "Booked",
] as const;

export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const CLOSED_LEAD_STATUSES: LeadStatusValue[] = ["Lost", "Booked"];

export const KNOWN_LEAD_SOURCES = [
  "google_ads",
  "meta_ads",
  "website",
  "manual",
] as const;

export const CALCULATOR_CARS = ["sedan", "suv", "innova"] as const;

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  website: "Website",
  manual: "Manual",
  // Legacy form types (stored on form_type after migration)
  taxi_calculator: "Taxi Calculator",
  quick_inquiry: "Quick Inquiry",
  plan_your_trip: "Plan Your Trip",
  request_callback: "Request Callback",
};

export function sourceLabel(
  source: string,
  masters?: { code: string; label: string }[] | Record<string, string>
) {
  if (Array.isArray(masters)) {
    return masters.find((item) => item.code === source)?.label ?? LEAD_SOURCE_LABELS[source] ?? source;
  }
  if (masters && masters[source]) return masters[source];
  return LEAD_SOURCE_LABELS[source] ?? source;
}

export function formatLeadNo(n: number) {
  return `LD-${n}`;
}

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(-10);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  } else if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  return digits;
}

/** Valid Indian mobile: 10 digits starting 6–9. */
export function isValidMobilePhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(digits);
}

export function todayDateOnly(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inclusive trip length in days from yyyy-MM-dd pickup/drop (0 if invalid). */
export function tripDaysFromDates(pickupDate?: string, dropDate?: string): number {
  if (!pickupDate?.trim() || !dropDate?.trim()) return 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dropDate)) return 0;
  if (dropDate < pickupDate) return 0;
  const start = Date.parse(`${pickupDate}T00:00:00`);
  const end = Date.parse(`${dropDate}T00:00:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function parseLeadDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Unix seconds vs ms
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return toDateOnlyFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    return null;
  }
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  // ISO / SQL date or datetime: 2026-08-29 or 2026-08-29T10:00:00
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);

  // DD-MM-YYYY or D-M-YYYY
  const dash = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) {
    return toDateOnlyFromParts(Number(dash[3]), Number(dash[2]), Number(dash[1]));
  }

  // DD/MM/YYYY (India) — prefer day-first when day > 12
  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const y = Number(slash[3]);
    if (a > 12) return toDateOnlyFromParts(y, b, a); // DD/MM
    if (b > 12) return toDateOnlyFromParts(y, a, b); // MM/DD
    // Ambiguous: treat as DD/MM (CRM is India-first)
    return toDateOnlyFromParts(y, b, a);
  }

  // DD-MMM-YYYY / DD MMM YYYY (e.g. 29-Aug-2026, 29 Aug 2026)
  const mon = v.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/);
  if (mon) {
    const month = monthNameToNumber(mon[2]);
    if (month) return toDateOnlyFromParts(Number(mon[3]), month, Number(mon[1]));
  }

  // Fallback: Date.parse for strings like "August 29, 2026"
  const parsed = Date.parse(v);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return toDateOnlyFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  return null;
}

function monthNameToNumber(name: string): number | null {
  const key = name.slice(0, 3).toLowerCase();
  const map: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  return map[key] ?? null;
}

function toDateOnlyFromParts(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Normalize to HH:MM:SS for Postgres time columns; empty → null. */
export function parseLeadTime(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const second = m[3] !== undefined ? Number(m[3]) : 0;
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

export function toTimeOnly(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    const hour = String(value.getHours()).padStart(2, "0");
    const minute = String(value.getMinutes()).padStart(2, "0");
    return `${hour}:${minute}`;
  }
  const m = String(value).match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
}

export function formatDisplayTime(value?: string): string {
  const time = toTimeOnly(value ?? "");
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function normalizeStatus(value: unknown, fallback: LeadStatusValue = "New Lead"): LeadStatusValue {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const lower = value.trim().toLowerCase().replace(/\s+/g, "-");
  const map: Record<string, LeadStatusValue> = {
    new: "New Lead",
    "new-lead": "New Lead",
    new_lead: "New Lead",
    cold: "Cold",
    hot: "Hot",
    lost: "Lost",
    booked: "Booked",
    // Legacy status codes
    contacted: "Cold",
    quoted: "Hot",
    "follow-up": "Hot",
    follow_up: "Hot",
    followup: "Hot",
    confirmed: "Booked",
  };
  if (map[lower]) return map[lower];
  if ((LEAD_STATUSES as readonly string[]).includes(value.trim())) {
    return value.trim() as LeadStatusValue;
  }
  return fallback;
}

export function toIso(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function toDateOnly(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
