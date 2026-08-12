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
  "taxi_calculator",
  "quick_inquiry",
  "plan_your_trip",
  "request_callback",
  "manual",
] as const;

export const CALCULATOR_CARS = ["sedan", "suv", "innova"] as const;

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  taxi_calculator: "Taxi Calculator",
  quick_inquiry: "Quick Inquiry",
  plan_your_trip: "Plan Your Trip",
  request_callback: "Request Callback",
  manual: "Manual",
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

export function parseLeadDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const dash = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) {
    return `${dash[3]}-${dash[2].padStart(2, "0")}-${dash[1].padStart(2, "0")}`;
  }
  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }
  return null;
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
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
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
