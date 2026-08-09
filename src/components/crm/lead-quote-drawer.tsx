"use client";

import * as React from "react";
import { FileText, MessageCircle, Pencil, RotateCcw, Send } from "lucide-react";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import { LeadItineraryCustomizeDrawer } from "@/components/crm/lead-itinerary-customize-drawer";
import {
  Lead,
  Quote,
  ItineraryTemplate,
  LeadCustomItinerary,
  cabFleet,
  estimateCabPrice,
  cloneItineraryFromTemplate,
  matchItineraryTemplate,
} from "@/lib/data";
function leadRoute(lead: Lead) {
  if (lead.pickup && lead.dropoff) return `${lead.pickup} → ${lead.dropoff}`;
  return lead.tourPackage;
}

export function LeadQuoteDrawer({
  lead,
  quotes,
  itineraries,
  open,
  onOpenChange,
  onSend,
  onAssignItinerary,
  onSaveCustomItinerary,
  onResetItinerary,
}: {
  lead: Lead | null;
  quotes: Quote[];
  itineraries: ItineraryTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (payload: {
    amount: number;
    note: string;
    sentVia: Quote["sentVia"];
    saveAsDraft: boolean;
  }) => void;
  onAssignItinerary: (templateId: string) => void;
  onSaveCustomItinerary: (custom: LeadCustomItinerary) => void;
  onResetItinerary: () => void;
}) {
  const [amount, setAmount] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  const [customizeDraft, setCustomizeDraft] = React.useState<LeadCustomItinerary | null>(null);

  React.useEffect(() => {
    if (!open || !lead) return;
    const estimated = estimateCabPrice(lead.cabType, lead.days) || lead.budget;
    setAmount(estimated);
    setNote(lead.tourPlan || "");
  }, [open, lead]);

  const leadQuotes = lead
    ? quotes.filter((q) => q.leadId === lead.id || q.customer === lead.name)
    : [];

  const rate = lead ? cabFleet.find((c) => c.name === lead.cabType)?.ratePerDay : undefined;

  const matchedTemplate = lead
    ? matchItineraryTemplate(itineraries, {
        templateId: lead.itineraryTemplateId,
        tourPackage: lead.tourPackage,
      })
    : undefined;

  const activeTemplates = itineraries.filter((t) => t.status === "Active" || t.status === "Draft");
  const isCustomized = Boolean(lead?.customItinerary);
  const dayCount = lead?.customItinerary?.daysPlan.length ?? matchedTemplate?.daysPlan.length ?? 0;

  function submit(saveAsDraft: boolean) {
    if (!lead || amount <= 0) return;
    onSend({
      amount,
      note: note.trim(),
      sentVia: saveAsDraft ? [] : ["WhatsApp"],
      saveAsDraft,
    });
  }

  function openCustomize() {
    if (!lead) return;
    if (lead.customItinerary) {
      setCustomizeDraft({
        ...lead.customItinerary,
        inclusions: [...lead.customItinerary.inclusions],
        daysPlan: lead.customItinerary.daysPlan.map((d) => ({ ...d })),
      });
    } else if (matchedTemplate) {
      setCustomizeDraft(cloneItineraryFromTemplate(matchedTemplate));
    } else {
      return;
    }
    setCustomizeOpen(true);
  }

  return (
    <>
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
                  {lead.id} · Prefills from this lead — send quote on WhatsApp
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

            {lead && (
              <div className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-slate uppercase">
                      Proposal itinerary
                    </p>
                    <p className="mt-1 text-sm font-medium text-ink-text">
                      {lead.customItinerary?.title ?? matchedTemplate?.name ?? "No template matched"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-soft">
                      {dayCount > 0 ? `${dayCount} days` : "—"}
                      {matchedTemplate ? ` · Master ${matchedTemplate.id}` : ""}
                    </p>
                  </div>
                  <Badge variant={isCustomized ? "default" : "secondary"}>
                    {isCustomized ? "Customized for guest" : "Using template"}
                  </Badge>
                </div>

                <Field label="Assign template">
                  <Select
                    value={lead.itineraryTemplateId || matchedTemplate?.id || ""}
                    onValueChange={(id) => onAssignItinerary(id)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select itinerary template" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!matchedTemplate && !lead.customItinerary}
                    onClick={openCustomize}
                  >
                    <Pencil className="size-3.5" /> Customize for guest
                  </Button>
                  {isCustomized ? (
                    <Button type="button" variant="ghost" size="sm" onClick={onResetItinerary}>
                      <RotateCcw className="size-3.5" /> Reset to template
                    </Button>
                  ) : null}
                </div>
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

              <div className="flex items-center gap-2 rounded-md border border-marigold bg-marigold-soft px-3 py-2 text-sm text-marigold-ink">
                <MessageCircle className="size-4 shrink-0" />
                Send via WhatsApp
              </div>
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
                          <p className="text-[11px] text-slate-soft">WhatsApp</p>
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
              disabled={amount <= 0}
              onClick={() => submit(false)}
            >
              <Send className="size-3.5" /> Send quote
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <LeadItineraryCustomizeDrawer
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        initial={customizeDraft}
        guestName={lead?.name}
        onSave={onSaveCustomItinerary}
      />
    </>
  );
}
