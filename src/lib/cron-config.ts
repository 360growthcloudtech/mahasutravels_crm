/**
 * Cron job config from env.
 *
 * Note: Vercel schedule (`vercel.json`) is deploy-time only; enable/hours here
 * control whether each hit actually runs and which reminder window it uses.
 */

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function getCronSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || null;
}

/** Authorize Bearer token or ?secret= against CRON_SECRET. */
export function authorizeCronRequest(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;

  const header = request.headers.get("authorization")?.trim() || "";
  if (header === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret")?.trim() === secret;
}

export type ReminderCronConfig = {
  enabled: boolean;
  /** Hours before pickup to fire (center of window). */
  hoursBefore: number;
  /** Half-window in minutes (e.g. 15 → ±15m around hoursBefore). */
  windowMinutes: number;
};

export function getTripReminderCronConfig(): ReminderCronConfig {
  return {
    enabled: parseBool(process.env.CRON_TRIP_REMINDERS_ENABLED, true),
    hoursBefore: parsePositiveNumber(process.env.CRON_TRIP_REMINDER_HOURS_BEFORE, 3),
    windowMinutes: parsePositiveNumber(process.env.CRON_REMINDER_WINDOW_MINUTES, 15),
  };
}

export function getPaymentReminderCronConfig(): ReminderCronConfig {
  return {
    enabled: parseBool(process.env.CRON_PAYMENT_REMINDERS_ENABLED, true),
    hoursBefore: parsePositiveNumber(process.env.CRON_PAYMENT_REMINDER_HOURS_BEFORE, 12),
    windowMinutes: parsePositiveNumber(process.env.CRON_REMINDER_WINDOW_MINUTES, 15),
  };
}
