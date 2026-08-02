"use client";

import * as React from "react";
import { FileDown, MessageCircle, Mail, MapPin, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { QuoteFormDialog } from "@/components/crm/quote-form-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Quote } from "@/lib/data";

const channelIcon = { WhatsApp: MessageCircle, PDF: FileDown, Email: Mail };

const itinerary = [
  { day: "Day 1", title: "Delhi → Shimla", detail: "Pickup 06:00 · ~7.5 hrs · Toll & parking included" },
  { day: "Day 2", title: "Shimla local sightseeing", detail: "Kufri, Mall Road, Jakhoo Temple · full day at disposal" },
  { day: "Day 3", title: "Shimla → Delhi", detail: "Checkout 09:00 · drop by 17:30" },
];

const costLines = [
  { label: "Base fare (3 days, Innova Crysta)", value: 10800 },
  { label: "Driver allowance", value: 1500 },
  { label: "Toll, parking & state tax", value: 1200 },
  { label: "Night charges (1 night)", value: 1000 },
];

export default function QuotesPage() {
  const { state, addQuote, updateQuote, deleteQuote } = useData();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = React.useState<Quote | null>(null);
  const total = costLines.reduce((sum, l) => sum + l.value, 0);

  return (
    <Shell>
      <Topbar
        eyebrow="Module 6 · Quote & itinerary builder"
        title="Quotes"
        action={
          <QuoteFormDialog
            trigger={
              <Button variant="marigold">
                <Plus className="size-4" /> New Quote
              </Button>
            }
            onSubmit={(data) => {
              addQuote(data);
              toast({ variant: "success", title: "Quote created", description: `Draft quote for ${data.customer} saved.` });
            }}
          />
        }
      />

      <main className="grid grid-cols-1 gap-4 px-6 py-6 lg:px-8 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>All quotes</CardTitle>
            <CardDescription>Sent via WhatsApp, PDF or email, tracked to acceptance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.quotes.map((q) => (
              <div
                key={q.id}
                className="flex flex-col gap-3 rounded-lg border border-border-soft p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-text">{q.customer}</p>
                    <span className="font-mono-data text-[11px] text-slate-soft">{q.id}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {q.route} · {q.days} days · {q.cabType}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {q.sentVia.length === 0 && (
                      <span className="text-[11px] text-slate-soft">Not sent yet</span>
                    )}
                    {q.sentVia.map((c) => {
                      const Icon = channelIcon[c];
                      return (
                        <span
                          key={c}
                          className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-slate"
                        >
                          <Icon className="size-3" /> {c}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <p className="font-mono-data text-sm font-semibold text-ink-text">
                      ₹{q.amount.toLocaleString("en-IN")}
                    </p>
                    <StatusBadge status={q.stage} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="size-8">
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <QuoteFormDialog
                        quote={q}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Pencil className="size-3.5" /> Edit quote
                          </DropdownMenuItem>
                        }
                        onSubmit={(data) => {
                          updateQuote(q.id, data);
                          toast({ variant: "success", title: "Quote updated", description: `${q.id} saved successfully.` });
                        }}
                      />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-signal focus:bg-signal-soft"
                        onSelect={(e) => {
                          e.preventDefault();
                          setDeleteTarget(q);
                        }}
                      >
                        <Trash2 className="size-3.5" /> Delete quote
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {state.quotes.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No quotes yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Quote builder preview</CardTitle>
            <CardDescription>Sample itinerary · Delhi → Shimla</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {itinerary.map((stop, i) => (
                <div key={stop.day} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marigold-soft text-marigold-ink">
                      <MapPin className="size-3.5" />
                    </div>
                    {i < itinerary.length - 1 && <div className="route-line-v mt-1 flex-1 opacity-30" />}
                  </div>
                  <div className="pb-2">
                    <p className="font-mono-data text-[11px] uppercase tracking-wide text-slate-soft">
                      {stop.day}
                    </p>
                    <p className="text-sm font-medium text-ink-text">{stop.title}</p>
                    <p className="text-xs text-muted-foreground">{stop.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              {costLines.map((l) => (
                <div key={l.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="font-mono-data text-ink-text">₹{l.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 text-sm font-semibold">
                <span className="text-ink-text">Total quote</span>
                <span className="font-mono-data text-marigold-ink">₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Badge variant="teal">Payment: 40% advance</Badge>
              <Badge variant="outline">Free cancellation · 48h</Badge>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="marigold" className="flex-1">
              <MessageCircle className="size-4" /> Send on WhatsApp
            </Button>
            <Button variant="outline" size="icon"><FileDown className="size-4" /></Button>
            <Button variant="outline" size="icon"><Mail className="size-4" /></Button>
          </CardFooter>
        </Card>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this quote?"
        description={`${deleteTarget?.id ?? ""} for ${deleteTarget?.customer ?? ""} will be permanently removed.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteQuote(deleteTarget.id);
            toast({ variant: "info", title: "Quote deleted", description: `${deleteTarget.id} was removed.` });
          }
        }}
      />
    </Shell>
  );
}
