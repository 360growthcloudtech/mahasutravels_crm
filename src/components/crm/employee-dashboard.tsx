"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  ClipboardCheck,
  IndianRupee,
  Plus,
  Phone,
} from "lucide-react";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/crm/revenue-chart";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { StatusBadge } from "@/components/crm/status-badge";
import { WebsiteFilter } from "@/components/crm/website-filter";
import { UserFilter } from "@/components/crm/user-filter";
import {
  DateRangeFilter,
  DashboardDateRange,
  rangeToISO,
} from "@/components/crm/date-range-filter";
import { StatCardsSkeleton } from "@/components/crm/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMyDashboard } from "@/lib/dashboard-me-api";
import type { EmployeeDashboardPayload } from "@/lib/db/dashboard-me";
import type { DashboardBookingSummary } from "@/lib/db/dashboard";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { useSession } from "@/lib/session-context";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function possessive(name: string) {
  const n = firstName(name);
  return n.endsWith("s") || n.endsWith("S") ? `${n}'` : `${n}'s`;
}

function formatTripDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function routeLabel(b: DashboardBookingSummary) {
  if (b.pickup && b.dropoff) return `${b.pickup} → ${b.dropoff}`;
  return "—";
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

function EmployeeBodySkeleton() {
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

export function EmployeeDashboard() {
  const { addLead, assignees } = useData();
  const { toast } = useToast();
  const { session, loading: sessionLoading } = useSession();
  const [dateRange, setDateRange] = React.useState<DashboardDateRange>(null);
  const [selectedWebsite, setSelectedWebsite] = React.useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [dashboard, setDashboard] = React.useState<EmployeeDashboardPayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  const canPickUser = session?.role !== "Employee";
  const userId = selectedUserId ?? session?.memberId ?? null;
  const userOptions = React.useMemo(() => {
    const list = assignees.map((a) => ({ id: a.id, name: a.name, role: a.role }));
    if (session?.memberId && !list.some((u) => u.id === session.memberId)) {
      list.unshift({ id: session.memberId, name: session.name, role: session.role });
    }
    return list;
  }, [assignees, session?.memberId, session?.name, session?.role]);

  const handleUserChange = React.useCallback((id: string) => {
    setSelectedUserId(id);
    setDashboard(null);
    setLoading(true);
  }, []);

  React.useEffect(() => {
    if (sessionLoading) return;
    let cancelled = false;
    const bounds = rangeToISO(dateRange);
    setLoading(true);
    void fetchMyDashboard({
      from: bounds?.from ?? null,
      to: bounds?.to ?? null,
      website: selectedWebsite,
      userId: canPickUser ? userId : undefined,
    })
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch((error) => {
        if (!cancelled) {
          toast({
            variant: "error",
            title: "Could not load your dashboard",
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
  }, [sessionLoading, dateRange, selectedWebsite, userId, canPickUser, toast]);

  const kpis = dashboard?.kpis;
  const revenue = kpis?.revenue ?? 0;
  const trendTotal = (dashboard?.revenueTrend ?? []).reduce((acc, d) => acc + d.revenue, 0);
  const trendRangeLabel = (() => {
    const f = dashboard?.filters;
    if (f?.from && f?.to) return `${f.from} → ${f.to}`;
    return "last 7 days";
  })();

  const viewedName = dashboard?.viewedUser.name ?? userOptions.find((u) => u.id === userId)?.name ?? session?.name ?? "you";
  const viewingSelf = !dashboard?.viewedUser.id || dashboard.viewedUser.id === session?.memberId;
  const mine = viewingSelf ? "My" : possessive(viewedName);
  const assignedLabel = viewingSelf ? "Assigned to you" : `Assigned to ${viewedName}`;
  const assignedToYou = viewingSelf ? "you" : viewedName;

  const stats = [
    {
      label: `${mine} leads`,
      value: String(kpis?.leadsTotal ?? 0),
      icon: Users,
      accent: "marigold" as const,
    },
    {
      label: "Quotes sent",
      value: String(kpis?.quotesSent ?? 0),
      icon: FileText,
      accent: "violet" as const,
    },
    {
      label: `${mine} bookings`,
      value: String(kpis?.bookingsCount ?? 0),
      icon: ClipboardCheck,
      accent: "teal" as const,
    },
    {
      label: `${mine} revenue`,
      value: `₹${revenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      accent: "signal" as const,
    },
  ];

  const pipeline = dashboard?.pipeline ?? [];
  const pipelineTotal = pipeline.reduce((s, p) => s + p.count, 0);
  const sourceSplit = dashboard?.sourceSplit ?? [];
  const followUps = dashboard?.followUps ?? [];
  const recentLeads = dashboard?.recentLeads ?? [];
  const ongoingBookings = dashboard?.ongoingBookings ?? [];
  const upcomingBookings = dashboard?.upcomingBookings ?? [];

  const chartData = (dashboard?.revenueTrend ?? []).map((d) => ({
    day: d.day,
    date: d.date,
    revenue: d.revenue,
    leads: d.leads,
  }));

  return (
    <>
      <Topbar
        title="Employee Dashboard"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canPickUser ? (
              <UserFilter
                value={userId}
                users={userOptions}
                currentUserId={session?.memberId}
                onChange={handleUserChange}
              />
            ) : null}
            <WebsiteFilter value={selectedWebsite} onChange={setSelectedWebsite} />
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
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
          </div>
        }
      />

      <main className="page-pad">
        {loading ? (
          <EmployeeBodySkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((s) => (
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
                    <div className="mt-3 text-xs text-muted-foreground">{assignedLabel}</div>
                  </CardContent>
                  <div className="route-line" />
                </Card>
              ))}
            </div>

            {pipeline.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {pipeline.map((p) => (
                  <div
                    key={p.status}
                    className="inline-flex items-center gap-2 rounded-md border border-border-soft bg-card px-3 py-1.5 text-xs"
                  >
                    <StatusBadge status={p.status} />
                    <span className="font-mono-data text-slate-soft">{p.count}</span>
                    {pipelineTotal > 0 ? (
                      <span className="text-muted-foreground">
                        {Math.round((p.count / pipelineTotal) * 100)}%
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle>{mine} revenue trend</CardTitle>
                      <CardDescription>
                        {viewingSelf ? "Your" : possessive(viewedName)} bookings by day recorded · {trendRangeLabel}
                      </CardDescription>
                    </div>
                    <Badge variant="teal">
                      ₹{(trendTotal / 100000).toFixed(2)}L total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <RevenueChart
                    data={chartData}
                    color="#0d9488"
                    sourceName={`${mine} revenue`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{mine} lead sources</CardTitle>
                  <CardDescription>From leads assigned to {assignedToYou}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sourceSplit.every((s) => s.count === 0) ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No leads in this range
                    </p>
                  ) : (
                    sourceSplit.map((s) => (
                      <div key={s.source} className="rounded-lg border border-transparent p-2.5">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="font-medium text-ink-text">{s.source}</span>
                          </div>
                          <span className="font-mono-data text-slate-soft">
                            {s.count} · {s.value}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${s.value}%`, backgroundColor: s.color }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>Follow-ups due</CardTitle>
                      <CardDescription>Leads with follow-up on or before today</CardDescription>
                    </div>
                    <Badge variant="signal">{followUps.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[22rem] overflow-y-auto px-5 pb-4">
                    {followUps.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No follow-ups due right now.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border-soft">
                        {followUps.map((l) => (
                          <li key={l.id} className="flex items-start gap-3 py-3 first:pt-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-ink-text">{l.name}</p>
                                <span className="shrink-0 font-mono-data text-[11px] text-slate-soft">
                                  {l.leadNo}
                                </span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <StatusBadge status={l.status} />
                                <span className="font-mono-data text-[11px] text-slate">
                                  {formatTripDate(l.nextFollowUpDate)}
                                  {l.nextFollowUpTime ? ` · ${l.nextFollowUpTime}` : ""}
                                </span>
                                {l.phone ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Phone className="size-3" />
                                    {l.phone}
                                  </span>
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
                      <Link href="/leads">Open leads</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>Recent leads</CardTitle>
                      <CardDescription>Last assigned to {assignedToYou}</CardDescription>
                    </div>
                    <Badge variant="secondary">{recentLeads.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[22rem] overflow-y-auto px-5 pb-4">
                    {recentLeads.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No leads assigned to {assignedToYou} yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border-soft">
                        {recentLeads.map((l) => (
                          <li key={l.id} className="flex items-start gap-3 py-3 first:pt-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-ink-text">{l.name}</p>
                                <span className="shrink-0 font-mono-data text-[11px] text-slate-soft">
                                  {l.leadNo}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {l.pickup && l.drop ? `${l.pickup} → ${l.drop}` : "—"}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <StatusBadge status={l.status} />
                                {l.website ? (
                                  <span className="inline-flex items-center rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    🌐 {l.website}
                                  </span>
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
                      <Link href="/leads">View all leads</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BookingListCard
                title={`${mine} ongoing trips`}
                description={
                  viewingSelf
                    ? "Your trips in progress today"
                    : `${possessive(viewedName)} trips in progress today`
                }
                badge={`${ongoingBookings.length} active`}
                badgeVariant="teal"
                items={ongoingBookings}
                emptyLabel={
                  viewingSelf
                    ? "No trips of yours are ongoing right now."
                    : `No trips of ${viewedName} are ongoing right now.`
                }
              />
              <BookingListCard
                title={`${mine} upcoming trips`}
                description={
                  viewingSelf
                    ? "Your departures after today"
                    : `${possessive(viewedName)} departures after today`
                }
                badge={`${upcomingBookings.length} upcoming`}
                badgeVariant="marigold"
                items={upcomingBookings}
                emptyLabel={
                  viewingSelf
                    ? "No upcoming bookings assigned to you."
                    : `No upcoming bookings assigned to ${viewedName}.`
                }
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}
