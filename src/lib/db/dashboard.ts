import { query } from "@/lib/db";
import { formatBookingNo } from "@/lib/booking-utils";
import { toDateOnly } from "@/lib/lead-utils";

export type DashboardFilters = {
  from?: string | null;
  to?: string | null;
  website?: string | null;
  source?: string | null;
};

export type DashboardKpiDeltas = {
  leadsPct: number;
  quotesPct: number;
  bookingsPct: number;
  revenuePct: number;
};

export type DashboardBookingSummary = {
  id: string;
  bookingNo: string;
  customer: string;
  travelDate: string;
  returnDate: string;
  status: string;
  website: string;
  pickup: string;
  dropoff: string;
  driver: string;
  source: string;
  total: number;
};

export type DashboardPayload = {
  filters: {
    from: string | null;
    to: string | null;
    website: string | null;
    source: string | null;
  };
  kpis: {
    leadsTotal: number;
    quotesSent: number;
    bookingsCount: number;
    revenue: number;
    lostLeads: number;
    conversionRate: number;
    deltas: DashboardKpiDeltas | null;
  };
  revenueTrend: Array<{
    day: string;
    date: string;
    revenue: number;
    leads: number;
    "Google Ads": number;
    "Meta Ads": number;
    Website: number;
    Manual: number;
  }>;
  sourceSplit: Array<{ source: string; count: number; value: number; color: string }>;
  marketing: {
    totalSpend: number;
    google: number;
    meta: number;
    other: number;
    cpl: number;
    roas: number;
  };
  agents: Array<{
    name: string;
    assigned: number;
    confirmed: number;
    revenue: number;
    conversion: number;
  }>;
  calendar: Array<{ date: string; count: number }>;
  /** All live bookings in range (for calendar day details). */
  liveBookings: DashboardBookingSummary[];
  ongoingBookings: DashboardBookingSummary[];
  upcomingBookings: DashboardBookingSummary[];
};

const FIXED_SOURCE_SPLIT: Array<{ code: string; label: string; color: string }> = [
  { code: "google_ads", label: "Google Ads", color: "#f5a524" },
  { code: "meta_ads", label: "Meta Ads", color: "#8b5cf6" },
  { code: "website", label: "Website", color: "#0d9488" },
  { code: "manual", label: "Manual", color: "#64748b" },
];

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDaysInclusive(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00Z`).getTime();
  const b = new Date(`${to}T12:00:00Z`).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

type RangeBounds = { from: string | null; to: string | null };

function normalizeFilters(input: DashboardFilters): RangeBounds & {
  website: string | null;
  source: string | null;
} {
  const from = input.from?.trim() || null;
  const to = input.to?.trim() || null;
  return {
    from: from && isDateOnly(from) ? from : null,
    to: to && isDateOnly(to) ? to : null,
    website: input.website?.trim() || null,
    source: input.source?.trim() || null,
  };
}

function priorRange(from: string, to: string): { from: string; to: string } {
  const len = diffDaysInclusive(from, to);
  const priorTo = addDaysIso(from, -1);
  const priorFrom = addDaysIso(priorTo, -(len - 1));
  return { from: priorFrom, to: priorTo };
}

function leadDateClause(alias: string, from: string | null, to: string | null, params: unknown[]): string | null {
  if (!from && !to) return null;
  if (from && to) {
    params.push(from, to);
    const a = params.length - 1;
    const b = params.length;
    return `${alias}.pickup_date IS NOT NULL AND ${alias}.pickup_date::date BETWEEN $${a}::date AND $${b}::date`;
  }
  if (from) {
    params.push(from);
    return `${alias}.pickup_date IS NOT NULL AND ${alias}.pickup_date::date >= $${params.length}::date`;
  }
  params.push(to);
  return `${alias}.pickup_date IS NOT NULL AND ${alias}.pickup_date::date <= $${params.length}::date`;
}

function bookingOverlapClause(
  alias: string,
  from: string | null,
  to: string | null,
  params: unknown[]
): string | null {
  if (!from && !to) return null;
  // Trip overlaps [from, to]: travel_date <= to AND COALESCE(return_date, travel_date) >= from
  if (from && to) {
    params.push(to, from);
    const toIdx = params.length - 1;
    const fromIdx = params.length;
    return `${alias}.travel_date IS NOT NULL
      AND ${alias}.travel_date::date <= $${toIdx}::date
      AND COALESCE(${alias}.return_date, ${alias}.travel_date)::date >= $${fromIdx}::date`;
  }
  if (from) {
    params.push(from);
    return `${alias}.travel_date IS NOT NULL
      AND COALESCE(${alias}.return_date, ${alias}.travel_date)::date >= $${params.length}::date`;
  }
  params.push(to);
  return `${alias}.travel_date IS NOT NULL AND ${alias}.travel_date::date <= $${params.length}::date`;
}

function spendDateClause(alias: string, from: string | null, to: string | null, params: unknown[]): string | null {
  if (!from && !to) return null;
  if (from && to) {
    params.push(from, to);
    const a = params.length - 1;
    const b = params.length;
    return `${alias}.spend_date BETWEEN $${a}::date AND $${b}::date`;
  }
  if (from) {
    params.push(from);
    return `${alias}.spend_date >= $${params.length}::date`;
  }
  params.push(to);
  return `${alias}.spend_date <= $${params.length}::date`;
}

function activityDateClause(alias: string, from: string | null, to: string | null, params: unknown[]): string | null {
  if (!from && !to) return null;
  if (from && to) {
    params.push(from, to);
    const a = params.length - 1;
    const b = params.length;
    return `${alias}.created_at::date BETWEEN $${a}::date AND $${b}::date`;
  }
  if (from) {
    params.push(from);
    return `${alias}.created_at::date >= $${params.length}::date`;
  }
  params.push(to);
  return `${alias}.created_at::date <= $${params.length}::date`;
}

function websiteClause(alias: string, website: string | null, params: unknown[]): string | null {
  if (!website) return null;
  params.push(website);
  return `${alias}.website = $${params.length}`;
}

/** Match UI source labels against lead codes or booking channel labels. */
function sourceClause(
  kind: "lead" | "booking",
  alias: string,
  source: string | null,
  params: unknown[]
): string | null {
  if (!source) return null;
  params.push(source);
  const idx = params.length;
  if (kind === "booking") {
    return `${alias}.source = $${idx}`;
  }
  return `(
    ${alias}.source = $${idx}
    OR EXISTS (
      SELECT 1 FROM lead_sources ls
      WHERE ls.code = ${alias}.source AND ls.label = $${idx}
    )
  )`;
}

async function countLeads(filters: ReturnType<typeof normalizeFilters>): Promise<number> {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const d = leadDateClause("l", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  const s = sourceClause("lead", "l", filters.source, params);
  if (s) clauses.push(s);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM leads l ${where}`,
    params
  );
  return Number(rows[0]?.count) || 0;
}

async function countLostLeads(filters: ReturnType<typeof normalizeFilters>): Promise<number> {
  const params: unknown[] = [];
  const clauses = [`l.status = 'Lost'`];
  const d = leadDateClause("l", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  const s = sourceClause("lead", "l", filters.source, params);
  if (s) clauses.push(s);
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM leads l WHERE ${clauses.join(" AND ")}`,
    params
  );
  return Number(rows[0]?.count) || 0;
}

async function countQuotesSent(filters: ReturnType<typeof normalizeFilters>): Promise<number> {
  const params: unknown[] = [];
  const clauses = [`a.action = 'quoted'`];
  const d = activityDateClause("a", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  const s = sourceClause("lead", "l", filters.source, params);
  if (s) clauses.push(s);
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM lead_activity a
     INNER JOIN leads l ON l.id = a.lead_id
     WHERE ${clauses.join(" AND ")}`,
    params
  );
  return Number(rows[0]?.count) || 0;
}

async function bookingKpis(filters: ReturnType<typeof normalizeFilters>): Promise<{
  bookingsCount: number;
  revenue: number;
}> {
  const params: unknown[] = [];
  const clauses = [`b.status NOT IN ('Cancelled', 'Refunded')`];
  const d = bookingOverlapClause("b", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("b", filters.website, params);
  if (w) clauses.push(w);
  const s = sourceClause("booking", "b", filters.source, params);
  if (s) clauses.push(s);
  const { rows } = await query<{ count: string; revenue: string }>(
    `SELECT COUNT(*)::text AS count, COALESCE(SUM(b.total), 0)::text AS revenue
     FROM bookings b
     WHERE ${clauses.join(" AND ")}`,
    params
  );
  return {
    bookingsCount: Number(rows[0]?.count) || 0,
    revenue: Number(rows[0]?.revenue) || 0,
  };
}

async function marketingSpend(filters: ReturnType<typeof normalizeFilters>): Promise<{
  totalSpend: number;
  google: number;
  meta: number;
  other: number;
}> {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const d = spendDateClause("s", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("s", filters.website, params);
  if (w) clauses.push(w);
  // source filter does not map cleanly to platforms; ignore for spend unless source is platform-like
  if (filters.source === "Google Ads" || filters.source === "Meta Ads") {
    params.push(filters.source);
    clauses.push(`s.platform = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<{ platform: string; amount: string }>(
    `SELECT s.platform, COALESCE(SUM(s.amount), 0)::text AS amount
     FROM ad_spends s
     ${where}
     GROUP BY s.platform`,
    params
  );
  let google = 0;
  let meta = 0;
  let other = 0;
  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    if (row.platform === "Google Ads") google += amount;
    else if (row.platform === "Meta Ads") meta += amount;
    else other += amount;
  }
  return { totalSpend: google + meta + other, google, meta, other };
}

async function sourceSplit(
  filters: ReturnType<typeof normalizeFilters>
): Promise<Array<{ source: string; count: number; value: number; color: string }>> {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const d = leadDateClause("l", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  // When filtering by source for trend, still show full split without source filter
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<{ code: string; count: string }>(
    `SELECT l.source AS code, COUNT(*)::text AS count
     FROM leads l
     ${where}
     GROUP BY l.source`,
    params
  );
  const countByCode = new Map(rows.map((r) => [r.code, Number(r.count) || 0]));
  const total = FIXED_SOURCE_SPLIT.reduce((s, item) => s + (countByCode.get(item.code) ?? 0), 0);
  return FIXED_SOURCE_SPLIT.map((item) => {
    const count = countByCode.get(item.code) ?? 0;
    return {
      source: item.label,
      count,
      value: total > 0 ? Math.round((count / total) * 100) : 0,
      color: item.color,
    };
  });
}

async function revenueTrend(
  filters: ReturnType<typeof normalizeFilters>
): Promise<
  Array<{
    day: string;
    date: string;
    revenue: number;
    leads: number;
    "Google Ads": number;
    "Meta Ads": number;
    Website: number;
    Manual: number;
  }>
> {
  // Prefer dashboard date range; otherwise last 7 days. Cap long ranges at 31 days.
  let end = filters.to ?? todayIso();
  let start = filters.from ?? addDaysIso(end, -6);
  if (!filters.from && filters.to) start = addDaysIso(end, -6);
  if (filters.from && !filters.to) end = addDaysIso(start, 6);
  if (diffDaysInclusive(start, end) > 31) start = addDaysIso(end, -30);

  const params: unknown[] = [start, end];
  const bookingExtra: string[] = [];
  const leadExtra: string[] = [];

  if (filters.website) {
    params.push(filters.website);
    bookingExtra.push(`AND b.website = $${params.length}`);
    leadExtra.push(`AND l.website = $${params.length}`);
  }
  if (filters.source) {
    params.push(filters.source);
    const idx = params.length;
    // Bookings store MarketingChannel labels (Website, Google Ads, …)
    bookingExtra.push(`AND b.source = $${idx}`);
    leadExtra.push(`AND (
      l.source = $${idx}
      OR EXISTS (SELECT 1 FROM lead_sources ls WHERE ls.code = l.source AND ls.label = $${idx})
    )`);
  }

  // Bucket by created_at so newly confirmed revenue shows even when travel_date is outside the window.
  const { rows: revRows } = await query<{
    day: string;
    revenue: string;
    google_ads: string;
    meta_ads: string;
    website: string;
    manual: string;
  }>(
    `SELECT gs::date::text AS day,
            COALESCE(SUM(b.total), 0)::text AS revenue,
            COALESCE(SUM(b.total) FILTER (WHERE b.source = 'Google Ads'), 0)::text AS google_ads,
            COALESCE(SUM(b.total) FILTER (WHERE b.source = 'Meta Ads'), 0)::text AS meta_ads,
            COALESCE(SUM(b.total) FILTER (WHERE b.source = 'Website'), 0)::text AS website,
            COALESCE(SUM(b.total) FILTER (WHERE b.source = 'Manual'), 0)::text AS manual
     FROM generate_series($1::date, $2::date, '1 day'::interval) gs
     LEFT JOIN bookings b
       ON b.status NOT IN ('Cancelled', 'Refunded')
      AND b.created_at::date = gs::date
      ${bookingExtra.join(" ")}
     GROUP BY gs::date
     ORDER BY gs::date`,
    params
  );

  const { rows: leadRows } = await query<{ day: string; leads: string }>(
    `SELECT gs::date::text AS day, COUNT(l.id)::text AS leads
     FROM generate_series($1::date, $2::date, '1 day'::interval) gs
     LEFT JOIN leads l
       ON l.created_at::date = gs::date
      ${leadExtra.join(" ")}
     GROUP BY gs::date
     ORDER BY gs::date`,
    params
  );

  const leadMap = new Map(leadRows.map((r) => [r.day, Number(r.leads) || 0]));
  return revRows.map((r) => ({
    day: dayLabel(r.day),
    date: r.day,
    revenue: Number(r.revenue) || 0,
    leads: leadMap.get(r.day) ?? 0,
    "Google Ads": Number(r.google_ads) || 0,
    "Meta Ads": Number(r.meta_ads) || 0,
    Website: Number(r.website) || 0,
    Manual: Number(r.manual) || 0,
  }));
}

async function agentPerformance(
  filters: ReturnType<typeof normalizeFilters>
): Promise<
  Array<{ name: string; assigned: number; confirmed: number; revenue: number; conversion: number }>
> {
  const leadParams: unknown[] = [];
  const leadClauses: string[] = [`l.assigned_to IS NOT NULL`];
  const ld = leadDateClause("l", filters.from, filters.to, leadParams);
  if (ld) leadClauses.push(ld);
  const lw = websiteClause("l", filters.website, leadParams);
  if (lw) leadClauses.push(lw);
  const ls = sourceClause("lead", "l", filters.source, leadParams);
  if (ls) leadClauses.push(ls);

  const { rows: assignedRows } = await query<{ name: string; assigned: string }>(
    `SELECT COALESCE(u.name, 'Unassigned') AS name, COUNT(*)::text AS assigned
     FROM leads l
     INNER JOIN users u ON u.id = l.assigned_to
     WHERE ${leadClauses.join(" AND ")}
     GROUP BY u.name`,
    leadParams
  );

  const bookingParams: unknown[] = [];
  const bookingClauses = [
    `b.status NOT IN ('Cancelled', 'Refunded')`,
    `trim(COALESCE(b.agent, '')) <> ''`,
  ];
  const bd = bookingOverlapClause("b", filters.from, filters.to, bookingParams);
  if (bd) bookingClauses.push(bd);
  const bw = websiteClause("b", filters.website, bookingParams);
  if (bw) bookingClauses.push(bw);
  const bs = sourceClause("booking", "b", filters.source, bookingParams);
  if (bs) bookingClauses.push(bs);

  const { rows: bookingRows } = await query<{ name: string; confirmed: string; revenue: string }>(
    `SELECT trim(b.agent) AS name,
            COUNT(*)::text AS confirmed,
            COALESCE(SUM(b.total), 0)::text AS revenue
     FROM bookings b
     WHERE ${bookingClauses.join(" AND ")}
     GROUP BY trim(b.agent)`,
    bookingParams
  );

  const map = new Map<
    string,
    { name: string; assigned: number; confirmed: number; revenue: number; conversion: number }
  >();

  for (const row of assignedRows) {
    map.set(row.name, {
      name: row.name,
      assigned: Number(row.assigned) || 0,
      confirmed: 0,
      revenue: 0,
      conversion: 0,
    });
  }
  for (const row of bookingRows) {
    const existing = map.get(row.name) ?? {
      name: row.name,
      assigned: 0,
      confirmed: 0,
      revenue: 0,
      conversion: 0,
    };
    existing.confirmed = Number(row.confirmed) || 0;
    existing.revenue = Number(row.revenue) || 0;
    map.set(row.name, existing);
  }

  return [...map.values()]
    .map((a) => ({
      ...a,
      conversion: a.assigned > 0 ? Math.round((a.confirmed / a.assigned) * 100) : a.confirmed > 0 ? 100 : 0,
    }))
    .sort((a, b) => b.conversion - a.conversion || b.revenue - a.revenue);
}

function mapBookingSummary(row: {
  id: string;
  booking_no: number;
  customer: string;
  travel_date: unknown;
  return_date: unknown;
  status: string;
  website: string;
  pickup: string;
  dropoff: string;
  driver: string;
  source: string;
  total: string | number;
}): DashboardBookingSummary {
  return {
    id: row.id,
    bookingNo: formatBookingNo(row.booking_no),
    customer: row.customer ?? "",
    travelDate: toDateOnly(row.travel_date),
    returnDate: toDateOnly(row.return_date),
    status: row.status ?? "",
    website: row.website ?? "",
    pickup: row.pickup ?? "",
    dropoff: row.dropoff ?? "",
    driver: row.driver ?? "",
    source: row.source ?? "",
    total: Number(row.total) || 0,
  };
}

async function listLiveBookings(
  filters: ReturnType<typeof normalizeFilters>
): Promise<DashboardBookingSummary[]> {
  const params: unknown[] = [];
  const clauses = [`b.status NOT IN ('Cancelled', 'Refunded')`];
  const d = bookingOverlapClause("b", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("b", filters.website, params);
  if (w) clauses.push(w);
  const s = sourceClause("booking", "b", filters.source, params);
  if (s) clauses.push(s);

  const { rows } = await query<{
    id: string;
    booking_no: number;
    customer: string;
    travel_date: unknown;
    return_date: unknown;
    status: string;
    website: string;
    pickup: string;
    dropoff: string;
    driver: string;
    source: string;
    total: string | number;
  }>(
    `SELECT b.id, b.booking_no, b.customer, b.travel_date, b.return_date, b.status,
            b.website, b.pickup, b.dropoff, b.driver, b.source, b.total
     FROM bookings b
     WHERE ${clauses.join(" AND ")}
     ORDER BY b.travel_date ASC NULLS LAST, b.booking_no ASC`,
    params
  );
  return rows.map(mapBookingSummary);
}

function buildCalendar(bookings: DashboardBookingSummary[]): Array<{ date: string; count: number }> {
  const map = new Map<string, number>();
  for (const b of bookings) {
    if (!b.travelDate) continue;
    const start = new Date(`${b.travelDate}T12:00:00Z`);
    const end = new Date(`${(b.returnDate || b.travelDate)}T12:00:00Z`);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function parseDashboardFilters(searchParams: URLSearchParams): {
  filters: DashboardFilters;
  error?: string;
} {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from && !isDateOnly(from)) return { filters: {}, error: "from must be YYYY-MM-DD" };
  if (to && !isDateOnly(to)) return { filters: {}, error: "to must be YYYY-MM-DD" };
  if (from && to && from > to) return { filters: {}, error: "from must be on or before to" };
  return {
    filters: {
      from,
      to,
      website: searchParams.get("website"),
      source: searchParams.get("source"),
    },
  };
}

export async function getDashboard(input: DashboardFilters): Promise<DashboardPayload> {
  const filters = normalizeFilters(input);
  const today = todayIso();

  const [leadsTotal, quotesSent, bookingStats, lostLeads, spend, split, trend, agents, liveBookings] =
    await Promise.all([
      countLeads(filters),
      countQuotesSent(filters),
      bookingKpis(filters),
      countLostLeads(filters),
      marketingSpend(filters),
      sourceSplit(filters),
      revenueTrend(filters),
      agentPerformance(filters),
      listLiveBookings(filters),
    ]);

  let deltas: DashboardKpiDeltas | null = null;
  if (filters.from && filters.to) {
    const prior = priorRange(filters.from, filters.to);
    const priorFilters = { ...filters, from: prior.from, to: prior.to };
    const [pLeads, pQuotes, pBookings] = await Promise.all([
      countLeads(priorFilters),
      countQuotesSent(priorFilters),
      bookingKpis(priorFilters),
    ]);
    deltas = {
      leadsPct: pctChange(leadsTotal, pLeads),
      quotesPct: pctChange(quotesSent, pQuotes),
      bookingsPct: pctChange(bookingStats.bookingsCount, pBookings.bookingsCount),
      revenuePct: pctChange(bookingStats.revenue, pBookings.revenue),
    };
  }

  const ongoingBookings = liveBookings
    .filter((b) => b.travelDate <= today && (b.returnDate || b.travelDate) >= today)
    .sort((a, b) => a.returnDate.localeCompare(b.returnDate) || a.id.localeCompare(b.id));

  const upcomingBookings = liveBookings
    .filter((b) => b.travelDate > today)
    .sort((a, b) => a.travelDate.localeCompare(b.travelDate) || a.id.localeCompare(b.id));

  const cpl = leadsTotal > 0 ? Math.round(spend.totalSpend / leadsTotal) : 0;
  const roas =
    spend.totalSpend > 0
      ? Math.round((bookingStats.revenue / spend.totalSpend) * 10) / 10
      : 0;

  const conversionRate =
    leadsTotal > 0
      ? Math.round((bookingStats.bookingsCount / leadsTotal) * 100)
      : bookingStats.bookingsCount > 0
        ? 100
        : 0;

  return {
    filters: {
      from: filters.from,
      to: filters.to,
      website: filters.website,
      source: filters.source,
    },
    kpis: {
      leadsTotal,
      quotesSent,
      bookingsCount: bookingStats.bookingsCount,
      revenue: bookingStats.revenue,
      lostLeads,
      conversionRate,
      deltas,
    },
    revenueTrend: trend,
    sourceSplit: split,
    marketing: {
      totalSpend: spend.totalSpend,
      google: spend.google,
      meta: spend.meta,
      other: spend.other,
      cpl,
      roas,
    },
    agents,
    calendar: buildCalendar(liveBookings),
    liveBookings,
    ongoingBookings,
    upcomingBookings,
  };
}
