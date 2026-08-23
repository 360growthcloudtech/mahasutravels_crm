"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  ClipboardCheck,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  TrendingUp,
  Target,
} from "lucide-react";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RevenueChart } from "@/components/crm/revenue-chart";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { StatusBadge } from "@/components/crm/status-badge";
import { BookingCalendarCard } from "@/components/crm/booking-calendar-card";
import { WebsiteFilter } from "@/components/crm/website-filter";
import {
  DateRangeFilter,
  DashboardDateRange,
  rangeToISO,
} from "@/components/crm/date-range-filter";
import { StatCardsSkeleton } from "@/components/crm/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeDashboard } from "@/components/crm/employee-dashboard";
import { fetchDashboard } from "@/lib/dashboard-api";
import type { DashboardBookingSummary, DashboardPayload } from "@/lib/db/dashboard";
import { useSession } from "@/lib/session-context";
import { useHasPermission } from "@/lib/use-has-permission";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function formatTripDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function routeLabel(b: DashboardBookingSummary) {
  if (b.pickup && b.dropoff) return `${b.pickup} → ${b.dropoff}`;
  return "—";
}

function formatDelta(pct: number | null | undefined): string | null {
  if (pct == null || Number.isNaN(pct)) return null;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

function BookingListCard({
  title,
  description,
  badge,
  badgeVariant,
  items,
  emptyLabel,
}: {
  title: string;
  description: string;
  badge: string;
  badgeVariant: "teal" | "marigold" | "violet" | "signal" | "secondary";
  items: DashboardBookingSummary[];
  emptyLabel: string;
}) {
  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardHeader className="shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={badgeVariant}>{badge}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 p-0">
        <div className="max-h-[28rem] overflow-y-auto px-5 pb-4">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {items.map((b) => (
                <li key={b.id} className="flex items-start gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium break-words text-ink-text">{b.customer}</p>
                      <span className="shrink-0 font-mono-data text-[11px] text-slate-soft">
                        {b.bookingNo || b.id}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs break-words text-muted-foreground">
                      {routeLabel(b)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono-data text-[11px] text-slate">
                        {formatTripDate(b.travelDate)}
                        {b.returnDate !== b.travelDate
                          ? ` – ${formatTripDate(b.returnDate)}`
                          : ""}
                      </span>
                      <StatusBadge status={b.status} />
                      {b.website ? (
                        <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          🌐 {b.website}
                        </span>
                      ) : null}
                      {b.driver ? (
                        <span className="truncate text-[11px] text-slate-soft">{b.driver}</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border-soft px-5 py-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/bookings">View all bookings</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardBodySkeleton() {
  return (
    <>
      <StatCardsSkeleton count={4} className="mb-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { session, loading: roleLoading } = useSession();
  const role = session?.role ?? null;

  if (roleLoading) {
    return (
      <>
        <Topbar title="Dashboard" />
        <main className="page-pad">
          <DashboardBodySkeleton />
        </main>
      </>
    );
  }

  if (role === "Employee") {
    return <EmployeeDashboard />;
  }

  return <OrgDashboard />;
}

function OrgDashboard() {
  const { addLead } = useData();
  const { toast } = useToast();
  const canCreateLead = useHasPermission("leads.create");
  const [dateRange, setDateRange] = React.useState<DashboardDateRange>(null);
  const [selectedSource, setSelectedSource] = React.useState<string | null>(null);
  const [selectedWebsite, setSelectedWebsite] = React.useState<string | null>(null);
  const [dashboard, setDashboard] = React.useState<DashboardPayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const bounds = rangeToISO(dateRange);
    setLoading(true);
    void fetchDashboard({
      from: bounds?.from ?? null,
      to: bounds?.to ?? null,
      website: selectedWebsite,
      // Source split click only filters the chart series client-side (not KPIs).
      source: null,
    })
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch((error) => {
        if (!cancelled) {
          toast({
            variant: "error",
            title: "Could not load dashboard",
            description: error instanceof Error ? error.message : "Please try again.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange, selectedWebsite, toast]);

  const activeSourceItem = dashboard?.sourceSplit.find((s) => s.source === selectedSource);
  const activeTrendData = dashboard?.revenueTrend ?? [];
  const activeTrendTotal = activeTrendData.reduce((acc, curr) => {
    if (selectedSource && selectedSource in curr) {
      return acc + (Number((curr as Record<string, unknown>)[selectedSource]) || 0);
    }
    return acc + curr.revenue;
  }, 0);
  const activeTrendColor = activeSourceItem?.color || "#0d9488";
  const formattedTrendBadge = `₹${(activeTrendTotal / 100000).toFixed(2)}L total`;
  const trendRangeLabel = (() => {
    const f = dashboard?.filters;
    if (f?.from && f?.to) return `${f.from} → ${f.to}`;
    return "last 7 days";
  })();

  const kpis = dashboard?.kpis;
  const deltas = kpis?.deltas;
  const marketing = dashboard?.marketing;
  const totalAdSpend = marketing?.totalSpend ?? 0;
  const googleAdSpend = marketing?.google ?? 0;
  const metaAdSpend = marketing?.meta ?? 0;
  const costPerLead = marketing?.cpl ?? 0;
  const roasRatio = marketing?.roas ?? 0;
  const revenue = kpis?.revenue ?? 0;
  const leadsTotal = kpis?.leadsTotal ?? 0;

  const stats = [
    {
      label: "Total leads",
      value: String(leadsTotal),
      delta: formatDelta(deltas?.leadsPct),
      icon: Users,
      accent: "marigold" as const,
    },
    {
      label: "Quotes sent",
      value: String(kpis?.quotesSent ?? 0),
      delta: formatDelta(deltas?.quotesPct),
      icon: FileText,
      accent: "violet" as const,
    },
    {
      label: "Bookings confirmed",
      value: String(kpis?.bookingsCount ?? 0),
      delta: formatDelta(deltas?.bookingsPct),
      icon: ClipboardCheck,
      accent: "teal" as const,
    },
    {
      label: "Revenue on record",
      value: `₹${revenue.toLocaleString("en-IN")}`,
      delta: formatDelta(deltas?.revenuePct),
      icon: IndianRupee,
      accent: "signal" as const,
    },
  ];

  const agents = dashboard?.agents ?? [];
  const sourceSplit = dashboard?.sourceSplit ?? [];
  const ongoingBookings = dashboard?.ongoingBookings ?? [];
  const upcomingBookings = dashboard?.upcomingBookings ?? [];
  const liveBookings = dashboard?.liveBookings ?? [];

  return (
    <>
      <Topbar
        title="Dashboard"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <WebsiteFilter value={selectedWebsite} onChange={setSelectedWebsite} />
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            {canCreateLead ? (
            <LeadFormDialog
              trigger={
                <Button variant="marigold">
                  <Plus className="size-4" /> New Lead
                </Button>
              }
              defaultWebsite={selectedWebsite || undefined}
              onSubmit={async (data) => {
                try {
                  const created = await addLead({
                    ...data,
                    website: data.website || selectedWebsite || "mahasutravels.com",
                  });
                  toast({
                    variant: "success",
                    title: created.inquiryCount > 1 ? "Repeat inquiry updated" : "Lead added",
                    description: `${created.name} was added for ${created.website || "mahasutravels.com"}.`,
                  });
                } catch (error) {
                  toast({
                    variant: "error",
                    title: "Could not add lead",
                    description: error instanceof Error ? error.message : "Please try again.",
                  });
                }
              }}
            />
            ) : null}
          </div>
        }
      />

      <main className="page-pad">
        {loading && !dashboard ? (
          <DashboardBodySkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((s) => {
                const deltaNum = s.delta ? Number.parseFloat(s.delta) : null;
                const positive = deltaNum == null || deltaNum >= 0;
                return (
                  <Card key={s.label} className="overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                          <p className="mt-1.5 font-display text-2xl font-semibold text-ink-text">
                            {s.value}
                          </p>
                        </div>
                        <div
                          className={
                            s.accent === "marigold"
                              ? "flex size-9 items-center justify-center rounded-md bg-marigold-soft text-marigold-ink"
                              : s.accent === "violet"
                                ? "flex size-9 items-center justify-center rounded-md bg-violet-soft text-violet"
                                : s.accent === "teal"
                                  ? "flex size-9 items-center justify-center rounded-md bg-teal-soft text-teal"
                                  : "flex size-9 items-center justify-center rounded-md bg-signal-soft text-signal"
                          }
                        >
                          <s.icon className="size-4.5" />
                        </div>
                      </div>
                      {s.delta ? (
                        <div
                          className={cn(
                            "mt-3 flex items-center gap-1 text-xs font-medium",
                            positive ? "text-teal" : "text-signal"
                          )}
                        >
                          {positive ? (
                            <ArrowUpRight className="size-3.5" />
                          ) : (
                            <ArrowDownRight className="size-3.5" />
                          )}
                          {s.delta}{" "}
                          <span className="font-normal text-muted-foreground">vs prior period</span>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-muted-foreground">
                          Select a date range for period comparison
                        </div>
                      )}
                    </CardContent>
                    <div className="route-line" />
                  </Card>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>Revenue trend</CardTitle>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow-xs transition-colors duration-200"
                          style={{ backgroundColor: activeTrendColor }}
                        >
                          {selectedSource || "All"}
                        </span>
                      </div>
                      <CardDescription>
                        {selectedSource
                          ? `Bookings by day recorded · ${trendRangeLabel} · ${selectedSource} only`
                          : `Bookings by day recorded · ${trendRangeLabel} · all sources`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedSource && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSource(null)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-ink-text"
                        >
                          Clear filter
                        </Button>
                      )}
                      <Badge variant="teal">{formattedTrendBadge}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <RevenueChart
                    data={activeTrendData}
                    color={activeTrendColor}
                    sourceName={selectedSource}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Lead source split</CardTitle>
                      <CardDescription>Click a source to filter trend</CardDescription>
                    </div>
                    {selectedSource && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSource(null)}
                        className="h-7 text-xs"
                      >
                        All sources
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sourceSplit.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No leads in this range
                    </p>
                  ) : (
                    sourceSplit.map((s) => {
                      const isSelected = selectedSource === s.source;
                      return (
                        <button
                          key={s.source}
                          type="button"
                          onClick={() => setSelectedSource(isSelected ? null : s.source)}
                          className={cn(
                            "group w-full rounded-lg p-2.5 text-left transition-all duration-150 border cursor-pointer",
                            isSelected
                              ? "bg-slate-50 border-slate-300 dark:bg-slate-800/60 dark:border-slate-700 shadow-xs ring-1 ring-black/5"
                              : "border-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/40 hover:border-slate-200"
                          )}
                        >
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: s.color }}
                              />
                              <span
                                className={cn(
                                  "font-medium transition-colors text-ink-text",
                                  isSelected && "font-semibold"
                                )}
                              >
                                {s.source}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono-data text-slate-soft">{s.value}%</span>
                              {isSelected && (
                                <span
                                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                                  style={{ backgroundColor: s.color }}
                                >
                                  Active
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${s.value}%`, backgroundColor: s.color }}
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>Ad Spend & Marketing ROI</CardTitle>
                        <Badge variant="marigold">
                          ₹{totalAdSpend.toLocaleString("en-IN")} Total Spend
                        </Badge>
                      </div>
                      <CardDescription>
                        {selectedWebsite
                          ? `Marketing performance & ad budget tracking for ${selectedWebsite}`
                          : "Marketing performance & ad budget tracking across all portals"}
                      </CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Link href="/marketing">Manage Ad Spend →</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-800/30">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Google Ads Spend</span>
                        <span className="font-semibold text-marigold-ink">
                          {totalAdSpend > 0 ? Math.round((googleAdSpend / totalAdSpend) * 100) : 0}%
                        </span>
                      </div>
                      <p className="mt-1 font-display text-xl font-bold text-ink-text">
                        ₹{googleAdSpend.toLocaleString("en-IN")}
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-marigold rounded-full"
                          style={{
                            width: `${totalAdSpend > 0 ? (googleAdSpend / totalAdSpend) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-800/30">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Meta Ads Spend</span>
                        <span className="font-semibold text-violet">
                          {totalAdSpend > 0 ? Math.round((metaAdSpend / totalAdSpend) * 100) : 0}%
                        </span>
                      </div>
                      <p className="mt-1 font-display text-xl font-bold text-ink-text">
                        ₹{metaAdSpend.toLocaleString("en-IN")}
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-violet rounded-full"
                          style={{
                            width: `${totalAdSpend > 0 ? (metaAdSpend / totalAdSpend) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-800/30">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Cost Per Lead (CPL)</span>
                        <Target className="size-3.5 text-teal" />
                      </div>
                      <p className="mt-1 font-display text-xl font-bold text-teal">
                        ₹{costPerLead.toLocaleString("en-IN")}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Based on {leadsTotal} total leads
                      </p>
                    </div>

                    <div className="rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-800/30">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Return on Ad Spend (ROAS)</span>
                        <TrendingUp className="size-3.5 text-signal" />
                      </div>
                      <p className="mt-1 font-display text-xl font-bold text-ink-text">{roasRatio}x</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        ₹{revenue.toLocaleString("en-IN")} revenue returned
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
              <Card className="xl:col-span-3">
                <CardHeader>
                  <CardTitle>Sales agent performance</CardTitle>
                  <CardDescription>Ranked by conversion in the selected range</CardDescription>
                </CardHeader>
                <CardContent>
                  {agents.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No agent activity in this range
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {agents.map((a) => (
                        <div key={a.name} className="flex items-center gap-4">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                            {a.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-ink-text">{a.name}</p>
                              <p className="font-mono-data text-xs text-slate-soft">
                                {a.confirmed}/{a.assigned} confirmed · ₹
                                {a.revenue.toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Progress value={a.conversion} className="h-1.5" />
                              <span className="w-9 shrink-0 text-right font-mono-data text-xs text-slate">
                                {a.conversion}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <BookingCalendarCard
                bookings={liveBookings}
                calendar={dashboard?.calendar}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BookingListCard
                title="Ongoing bookings"
                description="Trips in progress today"
                badge={`${ongoingBookings.length} active`}
                badgeVariant="teal"
                items={ongoingBookings}
                emptyLabel="No trips are ongoing right now."
              />
              <BookingListCard
                title="Upcoming bookings"
                description="Departures scheduled after today"
                badge={`${upcomingBookings.length} upcoming`}
                badgeVariant="marigold"
                items={upcomingBookings}
                emptyLabel="No upcoming bookings on the calendar."
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}
