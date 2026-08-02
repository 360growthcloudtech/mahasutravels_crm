"use client";

import { Zap, ArrowRight, MessageSquareText, CalendarClock, IndianRupee } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/lib/store";

const categoryMeta = {
  "Follow-up": { icon: MessageSquareText, variant: "violet" as const },
  Trip: { icon: CalendarClock, variant: "marigold" as const },
  Payment: { icon: IndianRupee, variant: "teal" as const },
};

export default function AutomationPage() {
  const { state, toggleRule } = useData();
  const { rules } = state;
  const activeCount = rules.filter((r) => r.enabled).length;
  const firedToday = rules.reduce((s, r) => s + r.firedToday, 0);

  return (
    <Shell>
      <Topbar eyebrow="Module 14 · Automation rules" title="Automation Rules" />

      <main className="px-6 py-6 lg:px-8">
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Active rules</p>
              <p className="mt-1 font-display text-xl font-semibold">
                {activeCount}<span className="text-sm font-normal text-slate-soft"> / {rules.length}</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Triggered today</p>
              <p className="mt-1 font-display text-xl font-semibold text-marigold-ink">{firedToday}</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Follow-ups auto-created</p>
              <p className="mt-1 font-display text-xl font-semibold text-violet">19 this week</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {rules.map((r) => {
            const meta = categoryMeta[r.category];
            const Icon = meta.icon;
            return (
              <Card key={r.id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={
                        meta.variant === "violet"
                          ? "flex size-9 shrink-0 items-center justify-center rounded-md bg-violet-soft text-violet"
                          : meta.variant === "marigold"
                          ? "flex size-9 shrink-0 items-center justify-center rounded-md bg-marigold-soft text-marigold-ink"
                          : "flex size-9 shrink-0 items-center justify-center rounded-md bg-teal-soft text-teal"
                      }
                    >
                      <Icon className="size-4.5" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-mono-data text-[11px] text-slate-soft">{r.id}</span>
                        <Badge variant={meta.variant} className="font-normal">
                          {r.category}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-ink-text">{r.trigger}</span>
                        <ArrowRight className="size-3.5 text-slate-soft" />
                        <span className="text-slate">{r.action}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pl-12 sm:pl-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-soft">
                      <Zap className="size-3.5" />
                      {r.firedToday} today
                    </div>
                    <Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </Shell>
  );
}
