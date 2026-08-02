"use client";

import { Users, FileText, ClipboardCheck, IndianRupee, ArrowUpRight, Phone, Plus } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RevenueChart } from "@/components/crm/revenue-chart";
import { RouteProgress } from "@/components/crm/route-progress";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { agents, sourceSplit } from "@/lib/data";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";

const pipelineStages = ["New", "Contacted", "Quoted", "Confirmed"];

export default function DashboardPage() {
  const { state, addLead } = useData();
  const { toast } = useToast();
  const { leads, bookings, quotes } = state;

  const confirmedRevenue = bookings
    .filter((b) => b.status !== "Cancelled" && b.status !== "Refunded")
    .reduce((s, b) => s + b.total, 0);

  const stats = [
    { label: "Total leads", value: String(leads.length), delta: "+12%", icon: Users, accent: "marigold" },
    { label: "Quotes sent", value: String(quotes.filter((q) => q.stage !== "Draft").length), delta: "+8%", icon: FileText, accent: "violet" },
    { label: "Bookings confirmed", value: String(bookings.length), delta: "+5%", icon: ClipboardCheck, accent: "teal" },
    { label: "Revenue on record", value: `₹${confirmedRevenue.toLocaleString("en-IN")}`, delta: "+18%", icon: IndianRupee, accent: "signal" },
  ];

  return (
    <Shell>
      <Topbar
        eyebrow="Overview · Live demo data"
        title="Dashboard"
        action={
          <LeadFormDialog
            trigger={
              <Button variant="marigold">
                <Plus className="size-4" /> New Lead
              </Button>
            }
            onSubmit={(data) => {
              addLead(data);
              toast({ variant: "success", title: "Lead added", description: `${data.name} was added to the pipeline.` });
            }}
          />
        }
      />

      <main className="px-6 py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                    <p className="mt-1.5 font-display text-2xl font-semibold text-ink-text">{s.value}</p>
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
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-teal">
                  <ArrowUpRight className="size-3.5" />
                  {s.delta} <span className="font-normal text-muted-foreground">vs last week</span>
                </div>
              </CardContent>
              <div className="route-line" />
            </Card>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revenue trend</CardTitle>
                  <CardDescription>Confirmed bookings, last 7 days</CardDescription>
                </div>
                <Badge variant="teal">₹3.73L total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead source split</CardTitle>
              <CardDescription>Where this week&apos;s leads came from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sourceSplit.map((s) => (
                <div key={s.source}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-text">{s.source}</span>
                    <span className="font-mono-data text-slate-soft">{s.value}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s.value}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle>Sales agent performance</CardTitle>
              <CardDescription>This week, ranked by conversion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {agents
                  .slice()
                  .sort((a, b) => b.conversion - a.conversion)
                  .map((a) => (
                    <div key={a.name} className="flex items-center gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-ink-text">{a.name}</p>
                          <p className="font-mono-data text-xs text-slate-soft">
                            {a.confirmed}/{a.assigned} confirmed · ₹{a.revenue.toLocaleString("en-IN")}
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
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pipeline snapshot</CardTitle>
                <Phone className="size-4 text-slate-soft" />
              </div>
              <CardDescription>Recent leads moving through the route</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {leads.slice(0, 3).map((l) => {
                const idx = Math.min(pipelineStages.indexOf(l.status), 3);
                const current = idx === -1 ? 0 : idx;
                return (
                  <div key={l.id} className="border-b border-border-soft pb-4 last:border-0 last:pb-0">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-ink-text">{l.name}</p>
                      <span className="font-mono-data text-[11px] text-slate-soft">{l.id}</span>
                    </div>
                    <p className="mb-2.5 text-xs text-muted-foreground">
                      {l.destination || l.tourPackage} · {l.pickup}
                    </p>
                    <RouteProgress stages={pipelineStages} current={current} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </main>
    </Shell>
  );
}
