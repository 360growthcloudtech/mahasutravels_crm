import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Play, ExternalLink, Plus } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Button } from "@/components/ui/button";
import { callLogs } from "@/lib/data";

const directionIcon = {
  Inbound: PhoneIncoming,
  Outbound: PhoneOutgoing,
};

export default function CallsPage() {
  const missed = callLogs.filter((c) => c.status === "Missed").length;
  const recorded = callLogs.filter((c) => c.recorded).length;

  return (
    <Shell>
      <Topbar eyebrow="Module 16 · Calling via Exotel" title="Calls" action={<Button variant="marigold"><Plus className="size-4" /> Click to Call</Button>} />

      <main className="px-6 py-6 lg:px-8">
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Calls today</p>
              <p className="mt-1 font-display text-xl font-semibold">{callLogs.length + 34}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Missed</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">{missed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Recorded</p>
              <p className="mt-1 font-display text-xl font-semibold text-teal">{recorded}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg. talk time</p>
              <p className="mt-1 font-display text-xl font-semibold">3m 30s</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4 bg-ink text-white">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-sm font-semibold">Connected to Exotel</p>
              <p className="mt-0.5 text-xs text-white/50">
                IVR routing, click-to-call and automatic recording are linked to every lead timeline.
              </p>
            </div>
            <Button variant="marigold" size="sm">
              <ExternalLink className="size-3.5" /> Open Exotel console
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="divide-y divide-border-soft p-0">
            {callLogs.map((c) => {
              const Icon = directionIcon[c.direction];
              return (
                <div key={c.id} className="flex items-center gap-4 p-4">
                  <div
                    className={
                      c.status === "Missed"
                        ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-signal-soft text-signal"
                        : "flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"
                    }
                  >
                    {c.status === "Missed" ? <PhoneMissed className="size-4" /> : <Icon className="size-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink-text">{c.customer}</p>
                      <span className="font-mono-data text-[11px] text-slate-soft">{c.phone}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.direction} · {c.time} {c.agent !== "—" && `· handled by ${c.agent}`}
                    </p>
                  </div>

                  <span className="hidden font-mono-data text-xs text-slate-soft sm:block">{c.duration}</span>
                  <StatusBadge status={c.status} />

                  {c.recorded ? (
                    <Button variant="outline" size="icon" className="size-8">
                      <Play className="size-3.5" />
                    </Button>
                  ) : (
                    <div className="size-8" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </Shell>
  );
}
