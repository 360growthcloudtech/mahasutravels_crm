import { query } from "@/lib/db";
import { formatBookingNo } from "@/lib/booking-utils";
import { formatLeadNo, toDateOnly } from "@/lib/lead-utils";
import type { DashboardBookingSummary } from "@/lib/db/dashboard";
import { parseDashboardFilters } from "@/lib/db/dashboard";

export type EmployeeDashboardFilters = {
  from?: string | null;
  to?: string | null;
  website?: string | null;
};

export type EmployeeDashboardPayload = {
  filters: {
    from: string | null;
    to: string | null;
    website: string | null;
  };
  kpis: {
    leadsTotal: number;
    quotesSent: number;
    bookingsCount: number;
    revenue: number;
  };
  pipeline: Array<{ status: string; count: number }>;
  followUps: Array<{
    id: string;
    leadNo: string;
    name: string;
    status: string;
    website: string;
    nextFollowUpDate: string;
    nextFollowUpTime: string;
    phone: string;
  }>;
  revenueTrend: Array<{ day: string; date: string; revenue: number; leads: number }>;
  sourceSplit: Array<{ source: string; count: number; value: number; color: string }>;
  ongoingBookings: DashboardBookingSummary[];
  upcomingBookings: DashboardBookingSummary[];
  recentLeads: Array<{
    id: string;
    leadNo: string;
    name: string;
    status: string;
    website: string;
    pickup: string;
    drop: string;
    source: string;
    lastInquiryAt: string;
  }>;
};

const FIXED_SOURCE_SPLIT: Array<{ code: string; label: string; color: string }> = [
  { code: "google_ads", label: "Google Ads", color: "#f5a524" },
  { code: "meta_ads", label: "Meta Ads", color: "#8b5cf6" },
  { code: "website", label: "Website", color: "#0d9488" },
  { code: "manual", label: "Manual", color: "#64748b" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
  return DAY_LABELS[d.getUTCDay()] ?? iso;
}

function normalizeFilters(input: EmployeeDashboardFilters) {
  const from = input.from?.trim() || null;
  const to = input.to?.trim() || null;
  return {
    from: from && isDateOnly(from) ? from : null,
    to: to && isDateOnly(to) ? to : null,
    website: input.website?.trim() || null,
  };
}

function leadDateClause(
  alias: string,
  from: string | null,
  to: string | null,
  params: unknown[]
): string | null {
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

function activityDateClause(
  alias: string,
  from: string | null,
  to: string | null,
  params: unknown[]
): string | null {
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

/** Booking belongs to employee via lead assignee or agent name match. */
function mineBookingClause(
  alias: string,
  userIdParam: number,
  agentNameParam: number
): string {
  return `(
    EXISTS (
      SELECT 1 FROM leads lmine
      WHERE lmine.id = ${alias}.lead_id
        AND lmine.assigned_to = $${userIdParam}::uuid
    )
    OR lower(trim(COALESCE(${alias}.agent, ''))) = lower(trim($${agentNameParam}))
  )`;
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

export function parseEmployeeDashboardFilters(searchParams: URLSearchParams): {
  filters: EmployeeDashboardFilters;
  error?: string;
} {
  const parsed = parseDashboardFilters(searchParams);
  if (parsed.error) return { filters: {}, error: parsed.error };
  return {
    filters: {
      from: parsed.filters.from,
      to: parsed.filters.to,
      website: parsed.filters.website,
    },
  };
}

export async function getEmployeeDashboard(
  userId: string,
  userName: string,
  input: EmployeeDashboardFilters
): Promise<EmployeeDashboardPayload> {
  const filters = normalizeFilters(input);
  const today = todayIso();

  const [
    leadsTotal,
    quotesSent,
    bookingStats,
    pipeline,
    followUps,
    trend,
    split,
    liveBookings,
    recentLeads,
  ] = await Promise.all([
    countMyLeads(userId, filters),
    countMyQuotes(userId, filters),
    myBookingKpis(userId, userName, filters),
    myPipeline(userId, filters),
    myFollowUps(userId, filters),
    myRevenueTrend(userId, userName, filters),
    mySourceSplit(userId, filters),
    listMyLiveBookings(userId, userName, filters),
    listMyRecentLeads(userId, filters),
  ]);

  const ongoingBookings = liveBookings
    .filter((b) => b.travelDate <= today && (b.returnDate || b.travelDate) >= today)
    .sort((a, b) => a.returnDate.localeCompare(b.returnDate) || a.id.localeCompare(b.id));

  const upcomingBookings = liveBookings
    .filter((b) => b.travelDate > today)
    .sort((a, b) => a.travelDate.localeCompare(b.travelDate) || a.id.localeCompare(b.id));

  return {
    filters: {
      from: filters.from,
      to: filters.to,
      website: filters.website,
    },
    kpis: {
      leadsTotal,
      quotesSent,
      bookingsCount: bookingStats.bookingsCount,
      revenue: bookingStats.revenue,
    },
    pipeline,
    followUps,
    revenueTrend: trend,
    sourceSplit: split,
    ongoingBookings,
    upcomingBookings,
    recentLeads,
  };
}

async function countMyLeads(
  userId: string,
  filters: ReturnType<typeof normalizeFilters>
): Promise<number> {
  const params: unknown[] = [userId];
  const clauses = [`l.assigned_to = $1::uuid`];
  const d = leadDateClause("l", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM leads l WHERE ${clauses.join(" AND ")}`,
    params
  );
  return Number(rows[0]?.count) || 0;
}

async function countMyQuotes(
  userId: string,
  filters: ReturnType<typeof normalizeFilters>
): Promise<number> {
  const params: unknown[] = [userId];
  const clauses = [`a.action = 'quoted'`, `l.assigned_to = $1::uuid`];
  const d = activityDateClause("a", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM lead_activity a
     INNER JOIN leads l ON l.id = a.lead_id
     WHERE ${clauses.join(" AND ")}`,
    params
  );
  return Number(rows[0]?.count) || 0;
}

async function myBookingKpis(
  userId: string,
  userName: string,
  filters: ReturnType<typeof normalizeFilters>
): Promise<{ bookingsCount: number; revenue: number }> {
  const params: unknown[] = [userId, userName];
  const clauses = [
    `b.status NOT IN ('Cancelled', 'Refunded')`,
    mineBookingClause("b", 1, 2),
  ];
  const d = bookingOverlapClause("b", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("b", filters.website, params);
  if (w) clauses.push(w);
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

async function myPipeline(
  userId: string,
  filters: ReturnType<typeof normalizeFilters>
): Promise<Array<{ status: string; count: number }>> {
  const params: unknown[] = [userId];
  const clauses = [`l.assigned_to = $1::uuid`];
  const d = leadDateClause("l", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  const { rows } = await query<{ status: string; count: string }>(
    `SELECT l.status, COUNT(*)::text AS count
     FROM leads l
     WHERE ${clauses.join(" AND ")}
     GROUP BY l.status
     ORDER BY COUNT(*) DESC, l.status ASC`,
    params
  );
  return rows.map((r) => ({ status: r.status, count: Number(r.count) || 0 }));
}

async function myFollowUps(
  userId: string,
  filters: ReturnType<typeof normalizeFilters>
): Promise<EmployeeDashboardPayload["followUps"]> {
  const params: unknown[] = [userId, todayIso()];
  const clauses = [
    `l.assigned_to = $1::uuid`,
    `l.next_follow_up_date IS NOT NULL`,
    `l.next_follow_up_date::date <= $2::date`,
  ];
  // Follow-ups ignore pickup date range; still allow website filter
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  const { rows } = await query<{
    id: string;
    lead_no: number;
    name: string;
    status: string;
    website: string | null;
    next_follow_up_date: unknown;
    next_follow_up_time: unknown;
    phone: string;
  }>(
    `SELECT l.id, l.lead_no, l.name, l.status, l.website,
            l.next_follow_up_date::text AS next_follow_up_date,
            l.next_follow_up_time::text AS next_follow_up_time,
            l.phone
     FROM leads l
     INNER JOIN lead_statuses ls ON ls.code = l.status
     WHERE ${clauses.join(" AND ")}
       AND ls.is_closed = false
     ORDER BY l.next_follow_up_date ASC NULLS LAST, l.next_follow_up_time ASC NULLS LAST
     LIMIT 10`,
    params
  );
  return rows.map((r) => ({
    id: r.id,
    leadNo: formatLeadNo(r.lead_no),
    name: r.name,
    status: r.status,
    website: r.website ?? "",
    nextFollowUpDate: toDateOnly(r.next_follow_up_date),
    nextFollowUpTime: typeof r.next_follow_up_time === "string" ? r.next_follow_up_time.slice(0, 5) : "",
    phone: r.phone ?? "",
  }));
}

async function myRevenueTrend(
  userId: string,
  userName: string,
  filters: ReturnType<typeof normalizeFilters>
): Promise<Array<{ day: string; date: string; revenue: number; leads: number }>> {
  let end = filters.to ?? todayIso();
  let start = filters.from ?? addDaysIso(end, -6);
  if (!filters.from && filters.to) start = addDaysIso(end, -6);
  if (filters.from && !filters.to) end = addDaysIso(start, 6);
  if (diffDaysInclusive(start, end) > 31) start = addDaysIso(end, -30);

  const bookingParams: unknown[] = [start, end, userId, userName];
  const bookingExtra: string[] = [mineBookingClause("b", 3, 4)];

  const leadParams: unknown[] = [start, end, userId];
  const leadExtra: string[] = [`AND l.assigned_to = $3::uuid`];

  if (filters.website) {
    bookingParams.push(filters.website);
    bookingExtra.push(`AND b.website = $${bookingParams.length}`);
    leadParams.push(filters.website);
    leadExtra.push(`AND l.website = $${leadParams.length}`);
  }

  const { rows: revRows } = await query<{ day: string; revenue: string }>(
    `SELECT gs::date::text AS day, COALESCE(SUM(b.total), 0)::text AS revenue
     FROM generate_series($1::date, $2::date, '1 day'::interval) gs
     LEFT JOIN bookings b
       ON b.status NOT IN ('Cancelled', 'Refunded')
      AND b.created_at::date = gs::date
      AND ${bookingExtra.join(" ")}
     GROUP BY gs::date
     ORDER BY gs::date`,
    bookingParams
  );

  const { rows: leadRows } = await query<{ day: string; leads: string }>(
    `SELECT gs::date::text AS day, COUNT(l.id)::text AS leads
     FROM generate_series($1::date, $2::date, '1 day'::interval) gs
     LEFT JOIN leads l
       ON l.created_at::date = gs::date
      ${leadExtra.join(" ")}
     GROUP BY gs::date
     ORDER BY gs::date`,
    leadParams
  );

  const leadMap = new Map(leadRows.map((r) => [r.day, Number(r.leads) || 0]));
  return revRows.map((r) => ({
    day: dayLabel(r.day),
    date: r.day,
    revenue: Number(r.revenue) || 0,
    leads: leadMap.get(r.day) ?? 0,
  }));
}

async function mySourceSplit(
  userId: string,
  filters: ReturnType<typeof normalizeFilters>
): Promise<Array<{ source: string; count: number; value: number; color: string }>> {
  const params: unknown[] = [userId];
  const clauses = [`l.assigned_to = $1::uuid`];
  const d = leadDateClause("l", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  const { rows } = await query<{ code: string; count: string }>(
    `SELECT l.source AS code, COUNT(*)::text AS count
     FROM leads l
     WHERE ${clauses.join(" AND ")}
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

async function listMyLiveBookings(
  userId: string,
  userName: string,
  filters: ReturnType<typeof normalizeFilters>
): Promise<DashboardBookingSummary[]> {
  const params: unknown[] = [userId, userName];
  const clauses = [
    `b.status NOT IN ('Cancelled', 'Refunded')`,
    mineBookingClause("b", 1, 2),
  ];
  const d = bookingOverlapClause("b", filters.from, filters.to, params);
  if (d) clauses.push(d);
  const w = websiteClause("b", filters.website, params);
  if (w) clauses.push(w);

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

async function listMyRecentLeads(
  userId: string,
  filters: ReturnType<typeof normalizeFilters>
): Promise<EmployeeDashboardPayload["recentLeads"]> {
  const params: unknown[] = [userId];
  const clauses = [`l.assigned_to = $1::uuid`];
  const w = websiteClause("l", filters.website, params);
  if (w) clauses.push(w);
  const { rows } = await query<{
    id: string;
    lead_no: number;
    name: string;
    status: string;
    website: string | null;
    pickup: string;
    drop_location: string;
    source: string;
    last_inquiry_at: unknown;
  }>(
    `SELECT l.id, l.lead_no, l.name, l.status, l.website, l.pickup, l.drop_location, l.source, l.last_inquiry_at
     FROM leads l
     WHERE ${clauses.join(" AND ")}
     ORDER BY l.last_inquiry_at DESC NULLS LAST, l.created_at DESC
     LIMIT 8`,
    params
  );
  return rows.map((r) => ({
    id: r.id,
    leadNo: formatLeadNo(r.lead_no),
    name: r.name,
    status: r.status,
    website: r.website ?? "",
    pickup: r.pickup ?? "",
    drop: r.drop_location ?? "",
    source: r.source,
    lastInquiryAt: r.last_inquiry_at ? String(r.last_inquiry_at) : "",
  }));
}
