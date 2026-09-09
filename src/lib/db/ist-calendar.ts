/** Business calendar for CRM “Created on” filters (India). */
export const IST_TIME_ZONE = "Asia/Kolkata";

export function todayIsoIst(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/**
 * Midnight IST as timestamptz. Use `::timestamp` not `::date`: Postgres
 * treats `date AT TIME ZONE` as timestamptz-in-session-TZ (UTC here), so the
 * bound becomes 05:30 UTC and drops leads created before ~5:30am IST.
 */
function istMidnight(paramIndex: number): string {
  return `($${paramIndex}::timestamp AT TIME ZONE '${IST_TIME_ZONE}')`;
}

/** Exclusive end: midnight IST of the day after a yyyy-MM-dd parameter. */
function istNextMidnight(paramIndex: number): string {
  return `(($${paramIndex}::date + 1)::timestamp AT TIME ZONE '${IST_TIME_ZONE}')`;
}

/**
 * Inclusive [from, to] match on a timestamptz column using IST calendar days.
 * Index-friendly range compare (not `created_at::date`).
 */
export function createdAtIstClause(
  alias: string,
  from: string | null,
  to: string | null,
  params: unknown[],
  column = "created_at"
): string | null {
  if (!from && !to) return null;
  const col = `${alias}.${column}`;
  if (from && to) {
    params.push(from, to);
    const a = params.length - 1;
    const b = params.length;
    return `${col} >= ${istMidnight(a)}
      AND ${col} < ${istNextMidnight(b)}`;
  }
  if (from) {
    params.push(from);
    return `${col} >= ${istMidnight(params.length)}`;
  }
  params.push(to);
  return `${col} < ${istNextMidnight(params.length)}`;
}

/** IST calendar date of a timestamptz column (for grouping by day). */
export function createdAtIstDayExpr(alias: string, column = "created_at"): string {
  return `(${alias}.${column} AT TIME ZONE '${IST_TIME_ZONE}')::date`;
}
