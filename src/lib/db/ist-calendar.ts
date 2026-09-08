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
    return `${col} >= ($${a}::date AT TIME ZONE '${IST_TIME_ZONE}')
      AND ${col} < (($${b}::date + 1) AT TIME ZONE '${IST_TIME_ZONE}')`;
  }
  if (from) {
    params.push(from);
    return `${col} >= ($${params.length}::date AT TIME ZONE '${IST_TIME_ZONE}')`;
  }
  params.push(to);
  return `${col} < (($${params.length}::date + 1) AT TIME ZONE '${IST_TIME_ZONE}')`;
}

/** IST calendar date of a timestamptz column (for grouping by day). */
export function createdAtIstDayExpr(alias: string, column = "created_at"): string {
  return `(${alias}.${column} AT TIME ZONE '${IST_TIME_ZONE}')::date`;
}
