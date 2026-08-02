import { AlertTriangle, Car, User, Plus } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trips } from "@/lib/data";

const views = ["Daily trips", "Upcoming trips", "Driver-wise", "Vehicle-wise", "Payment pending"];

export default function CalendarPage() {
  const grouped = trips.reduce<Record<string, typeof trips>>((acc, t) => {
    acc[t.date] = acc[t.date] ? [...acc[t.date], t] : [t];
    return acc;
  }, {});

  return (
    <Shell>
      <Topbar eyebrow="Module 11 · Trip calendar & dispatch" title="Trip Calendar" action={<Button variant="marigold"><Plus className="size-4" /> Schedule Trip</Button>} />

      <main className="px-6 py-6 lg:px-8">
        <Card className="mb-4 border-signal/30 bg-signal-soft/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-signal/15 text-signal">
              <AlertTriangle className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-text">Double-booking flagged</p>
              <p className="text-xs text-muted-foreground">
                Driver Rakesh Negi (HP-08-2210) is booked for two overlapping trips on 30 Jul — TR-502 and a
                pending Kasauli return leg. Reassign before confirming.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="Daily trips" className="mb-4">
          <TabsList className="h-auto flex-wrap">
            {views.map((v) => (
              <TabsTrigger key={v} value={v} className="text-xs">
                {v}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayTrips]) => (
            <div key={date}>
              <div className="mb-3 flex items-center gap-3">
                <p className="font-display text-sm font-semibold text-ink-text">{date}</p>
                <div className="route-line flex-1 opacity-40" />
                <span className="font-mono-data text-[11px] text-slate-soft">
                  {dayTrips.length} trip{dayTrips.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-3">
                {dayTrips.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-14 shrink-0 text-right">
                          <p className="font-mono-data text-sm font-semibold text-ink-text">{t.time}</p>
                          <p className="font-mono-data text-[10px] text-slate-soft">{t.id}</p>
                        </div>
                        <div className="route-line-v self-stretch opacity-40" />
                        <div>
                          <p className="text-sm font-medium text-ink-text">{t.customer}</p>
                          <p className="text-xs text-muted-foreground">{t.route}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate">
                            <span className="flex items-center gap-1">
                              <User className="size-3" /> {t.driver}
                            </span>
                            <span className="flex items-center gap-1 font-mono-data">
                              <Car className="size-3" /> {t.vehicle}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-[4.5rem] sm:pl-0">
                        {t.id === "TR-502" && <Badge variant="signal">Conflict</Badge>}
                        <StatusBadge status={t.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </Shell>
  );
}
