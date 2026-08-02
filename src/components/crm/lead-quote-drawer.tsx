"use client";

import * as React from "react";
import { ExternalLink, FileText, Mail, MessageCircle, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/crm/field";
import { StatusBadge } from "@/components/crm/status-badge";
import { Lead, Quote, cabFleet, estimateCabPrice } from "@/lib/data";
import { cn } from "@/lib/utils";

const channels = [
  { id: "WhatsApp" as const, label: "WhatsApp", icon: MessageCircle },
  { id: "PDF" as const, label: "PDF", icon: FileText },
  { id: "Email" as const, label: "Email", icon: Mail },
];

function leadRoute(lead: Lead) {
  if (lead.pickup && lead.dropoff) return `${lead.pickup} → ${lead.dropoff}`;
  return lead.tourPackage;
}

export function LeadQuoteDrawer({
  lead,
  quotes,
  open,
  onOpenChange,
  onSend,
}: {
  lead: Lead | null;
  quotes: Quote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (payload: {
    amount: number;
    note: string;
    sentVia: Quote["sentVia"];
    saveAsDraft: boolean;
  }) => void;
}) {
  const [amount, setAmount] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [sentVia, setSentVia] = React.useState<Quote["sentVia"]>(["WhatsApp"]);

  React.useEffect(() => {
    if (!open || !lead) return;
    const estimated = estimateCabPrice(lead.cabType, lead.days) || lead.budget;
    setAmount(estimated);
    setNote(lead.tourPlan || "");
    setSentVia(["WhatsApp"]);
  }, [open, lead]);

  const leadQuotes = lead
    ? quotes.filter((q) => q.leadId === lead.id || q.customer === lead.name)
    : [];

  const rate = lead ? cabFleet.find((c) => c.name === lead.cabType)?.ratePerDay : undefined;

  function toggleChannel(channel: Quote["sentVia"][number]) {
    setSentVia((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  function openProposal() {
    if (!lead) return;
    const url = `/proposal/${lead.id}?amount=${encodeURIComponent(String(amount || lead.budget))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function submit(saveAsDraft: boolean) {
    if (!lead || amount <= 0) return;
    if (!saveAsDraft && sentVia.length === 0) return;
    if (!saveAsDraft && sentVia.includes("PDF")) {
      openProposal();
    }
    onSend({
      amount,
      note: note.trim(),
      sentVia: saveAsDraft ? [] : sentVia,
      saveAsDraft,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="size-4 text-slate" />
            Send quote
          </SheetTitle>
          {lead && (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-text">{lead.name}</span>
                <StatusBadge status={lead.status} />
              </div>
              <SheetDescription>
                {lead.id} · Prefills from this lead — preview a dummy PDF proposal anytime
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <SheetBody className="space-y-5">
          {lead && (
            <div className="rounded-md border border-border-soft bg-secondary/40 px-3 py-2.5 text-xs">
              <p className="font-medium text-ink-text">{lead.tourPackage}</p>
              <p className="mt-1 text-slate">
                {leadRoute(lead)} · {lead.days}d · {lead.cabType}
              </p>
              <p className="mt-1 text-slate-soft">
                {lead.adults}A{lead.kids > 0 ? `+${lead.kids}K` : ""} · Agent {lead.agent}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <Field label="Quote amount (₹)">
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              {lead && rate ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Est. ₹{rate.toLocaleString("en-IN")}/day × {lead.days} day
                  {lead.days === 1 ? "" : "s"}
                </p>
              ) : null}
            </Field>

            <Field label="Quote note">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Inclusions, exclusions, payment terms…"
                rows={3}
              />
            </Field>

            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-text">Send via</p>
              <div className="flex flex-wrap gap-2">
                {channels.map((c) => {
                  const active = sentVia.includes(c.id);
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleChannel(c.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                        active
                          ? "border-marigold bg-marigold-soft text-marigold-ink"
                          : "border-border bg-card text-slate hover:bg-secondary"
                      )}
                    >
                      <Icon className="size-3.5" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={openProposal}>
              <ExternalLink className="size-3.5" /> Preview PDF proposal
            </Button>
          </div>

          {leadQuotes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-slate uppercase">
                Quotes on this lead
              </p>
              <div className="space-y-2">
                {leadQuotes.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between rounded-md border border-border-soft px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono-data text-[11px] text-slate-soft">{q.id}</p>
                      <p className="text-sm font-medium text-ink-text">
                        ₹{q.amount.toLocaleString("en-IN")}
                      </p>
                      {q.sentVia.length > 0 ? (
                        <p className="text-[11px] text-slate-soft">{q.sentVia.join(" · ")}</p>
                      ) : (
                        <p className="text-[11px] text-slate-soft">Not sent</p>
                      )}
                    </div>
                    <StatusBadge status={q.stage} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => submit(true)}>
            Save draft
          </Button>
          <Button
            variant="marigold"
            disabled={amount <= 0 || sentVia.length === 0}
            onClick={() => submit(false)}
          >
            <Send className="size-3.5" /> Send quote
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
