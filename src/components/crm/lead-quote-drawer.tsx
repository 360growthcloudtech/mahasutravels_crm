"use client";

import * as React from "react";
import {
  ExternalLink,
  FileText,
  GripVertical,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/crm/field";
import { ComboTextField } from "@/components/crm/combo-text-field";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/crm/date-picker";
import {
  Lead,
  ItineraryTemplate,
  matchItineraryTemplate,
} from "@/lib/data";
import {
  applyTemplateToQuote,
  buildQuoteDefaults,
  type LeadQuoteDto,
  type LeadQuoteInput,
  type QuoteDay,
  type QuoteHotel,
} from "@/lib/quote-defaults";
import {
  fetchLeadQuote,
  saveLeadQuoteDraft,
  sendLeadQuoteApi,
} from "@/lib/lead-quotes-api";
import { isValidMobilePhone } from "@/lib/lead-utils";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";

function uniqueDayTitleOptions(itineraries: ItineraryTemplate[]) {
  const seen = new Set<string>();
  const options: { value: string; label: string; description?: string }[] = [];
  for (const template of itineraries) {
    for (const day of template.daysPlan ?? []) {
      const title = day.title?.trim();
      if (!title) continue;
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({
        value: title,
        label: title,
        description: template.name || template.tourPackage,
      });
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function listToLines(list: string[]): string {
  return list.join("\n");
}

function emptyDay(day: number): QuoteDay {
  return {
    day,
    date: "",
    title: "",
    distance: "",
    stay: "",
    detail: "",
    highlights: [],
    overnight: "",
  };
}

function emptyHotel(): QuoteHotel {
  return {
    location: "",
    hotel_name: "",
    category: "",
    nights: "",
    rooms: "",
    rate: "",
    notes: "",
  };
}

export function LeadQuoteDrawer({
  lead,
  itineraries,
  open,
  onOpenChange,
  onSent,
}: {
  lead: Lead | null;
  itineraries: ItineraryTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful send so the parent can refresh the lead. */
  onSent?: () => void;
}) {
  const { toast } = useToast();
  const { state } = useData();
  const [form, setForm] = React.useState<LeadQuoteInput | null>(null);
  const [saved, setSaved] = React.useState<LeadQuoteDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [tab, setTab] = React.useState("guest");

  const activeTemplates = itineraries.filter((t) => t.status === "Active" || t.status === "Draft");
  const dayTitleOptions = React.useMemo(
    () => uniqueDayTitleOptions(itineraries),
    [itineraries]
  );
  const hotelNameOptions = React.useMemo(() => {
    return state.hotelTemplates
      .filter((h) => h.status === "Active" || h.status === "Draft")
      .map((h) => ({
        value: h.id,
        label: h.name,
        description: [h.city, h.defaultRoomType].filter(Boolean).join(" · "),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [state.hotelTemplates]);

  React.useEffect(() => {
    if (!open || !lead) {
      setForm(null);
      setSaved(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setTab("guest");
    void (async () => {
      try {
        const existing = await fetchLeadQuote(lead.id);
        if (cancelled) return;
        if (existing) {
          const { id: _id, lead_id: _lid, status: _s, created_at: _c, updated_at: _u, ...rest } =
            existing;
          setForm({ ...rest, hotels: rest.hotels ?? [] });
          setSaved(existing);
        } else {
          setForm(buildQuoteDefaults(lead, itineraries));
          setSaved(null);
        }
      } catch {
        if (!cancelled) {
          setForm(buildQuoteDefaults(lead, itineraries));
          setSaved(null);
          toast({
            variant: "error",
            title: "Could not load saved quote",
            description: "Starting from lead defaults.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function patchForm(patch: Partial<LeadQuoteInput>) {
    setForm((f) => (f ? { ...f, ...patch } : f));
  }

  function updateDay(index: number, patch: Partial<QuoteDay>) {
    setForm((f) => {
      if (!f) return f;
      const days = f.days.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...f, days };
    });
  }

  function addDay() {
    setForm((f) => {
      if (!f) return f;
      const next = f.days.length + 1;
      return { ...f, days: [...f.days, emptyDay(next)] };
    });
  }

  function removeDay(index: number) {
    setForm((f) => {
      if (!f || f.days.length <= 1) return f;
      const days = f.days
        .filter((_, i) => i !== index)
        .map((d, i) => ({ ...d, day: i + 1 }));
      return { ...f, days };
    });
  }

  function moveDay(index: number, dir: -1 | 1) {
    setForm((f) => {
      if (!f) return f;
      const j = index + dir;
      if (j < 0 || j >= f.days.length) return f;
      const days = [...f.days];
      [days[index], days[j]] = [days[j], days[index]];
      return { ...f, days: days.map((d, i) => ({ ...d, day: i + 1 })) };
    });
  }

  function updateHotel(index: number, patch: Partial<QuoteHotel>) {
    setForm((f) => {
      if (!f) return f;
      const hotels = (f.hotels ?? []).map((h, i) => (i === index ? { ...h, ...patch } : h));
      return { ...f, hotels };
    });
  }

  function addHotel() {
    setForm((f) => (f ? { ...f, hotels: [...(f.hotels ?? []), emptyHotel()] } : f));
  }

  function removeHotel(index: number) {
    setForm((f) => {
      if (!f) return f;
      return { ...f, hotels: (f.hotels ?? []).filter((_, i) => i !== index) };
    });
  }

  function loadTemplate(templateId: string) {
    if (!form) return;
    const template = itineraries.find((t) => t.id === templateId);
    if (!template) return;
    if (
      form.days.some((d) => d.title || d.detail) &&
      !window.confirm("Replace tour title, days and inclusions with this template?")
    ) {
      return;
    }
    setForm(applyTemplateToQuote(form, template));
    toast({ variant: "info", title: "Template loaded", description: template.name });
  }

  async function handleSaveDraft() {
    if (!lead || !form) return;
    setSaving(true);
    try {
      const quote = await saveLeadQuoteDraft(lead.id, form);
      setSaved(quote);
      const { id: _id, lead_id: _lid, status: _s, created_at: _c, updated_at: _u, ...rest } = quote;
      setForm(rest);
      toast({ variant: "success", title: "Draft saved" });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not save draft",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  const guestPhone = form?.guest_phone?.trim() || "";
  const phoneOk = guestPhone ? isValidMobilePhone(guestPhone) : false;

  async function handleSend() {
    if (!lead || !form) return;
    if (form.amount <= 0) {
      toast({ variant: "error", title: "Enter a quote amount" });
      setTab("pricing");
      return;
    }
    if (!guestPhone) {
      toast({
        variant: "error",
        title: "Phone required",
        description: "Add a guest phone before sending the quote on WhatsApp.",
      });
      setTab("guest");
      return;
    }
    if (!phoneOk) {
      toast({
        variant: "error",
        title: "Invalid phone",
        description: "Enter a valid 10-digit Indian mobile number.",
      });
      setTab("guest");
      return;
    }
    setSending(true);
    try {
      const quote = await sendLeadQuoteApi(lead.id, form);
      setSaved(quote);
      toast({
        variant: "success",
        title: "Quote sent on WhatsApp",
        description: `WhatsApp message sent to ${guestPhone}.`,
      });
      onSent?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not send quote",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  const proposalHref = lead
    ? `/proposal/${lead.id}?preview=1`
    : "";

  const matchedTemplate = lead
    ? matchItineraryTemplate(itineraries, {
        templateId: lead.itineraryTemplateId,
        tourPackage: lead.tourPackage,
      })
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="size-4 text-slate" />
            Quote package
          </SheetTitle>
          {lead && (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-text">{lead.name}</span>
                <StatusBadge status={lead.status} />
                {saved ? <StatusBadge status={saved.status} /> : <Badge variant="secondary">New</Badge>}
              </div>
              <SheetDescription>
                {lead.leadNo} · Auto-filled from lead — edit then save or send
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <SheetBody className="flex-1 space-y-4 overflow-y-auto">
          {loading || !form ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-soft">
              <Loader2 className="size-4 animate-spin" /> Loading quote…
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border p-3">
                <Field label="Load from template">
                  <Select
                    value={matchedTemplate?.id || ""}
                    onValueChange={(id) => loadTemplate(id)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
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
              </div>

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="guest">Guest & trip</TabsTrigger>
                  <TabsTrigger value="days">Itinerary</TabsTrigger>
                  <TabsTrigger value="hotels">Hotels</TabsTrigger>
                  <TabsTrigger value="package">Package</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                </TabsList>

                <TabsContent value="guest" className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Guest name">
                      <Input
                        value={form.guest_name}
                        onChange={(e) => patchForm({ guest_name: e.target.value })}
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={form.guest_phone}
                        onChange={(e) => patchForm({ guest_phone: e.target.value })}
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        value={form.guest_email}
                        onChange={(e) => patchForm({ guest_email: e.target.value })}
                      />
                    </Field>
                    <Field label="Destination">
                      <Input
                        value={form.destination}
                        onChange={(e) => patchForm({ destination: e.target.value })}
                      />
                    </Field>
                    <Field label="Adults">
                      <Input
                        type="number"
                        min={0}
                        value={form.adults}
                        onChange={(e) => patchForm({ adults: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Kids">
                      <Input
                        type="number"
                        min={0}
                        value={form.kids}
                        onChange={(e) => patchForm({ kids: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Kids note" className="sm:col-span-2">
                      <Input
                        value={form.kids_note}
                        onChange={(e) => patchForm({ kids_note: e.target.value })}
                        placeholder="e.g. Between 5 to 7 years"
                      />
                    </Field>
                    <Field label="Travel date">
                      <DatePicker
                        value={form.travel_date || ""}
                        onChange={(v) => patchForm({ travel_date: v || null })}
                        placeholder="Select travel date"
                      />
                    </Field>
                    <Field label="Return date">
                      <DatePicker
                        value={form.return_date || ""}
                        onChange={(v) => patchForm({ return_date: v || null })}
                        placeholder="Select return date"
                      />
                    </Field>
                    <Field label="Duration">
                      <Input
                        value={form.duration_label}
                        onChange={(e) => patchForm({ duration_label: e.target.value })}
                        placeholder="10 Nights / 11 Days"
                      />
                    </Field>
                    <Field label="Vehicle">
                      <Input
                        value={form.vehicle_label}
                        onChange={(e) => patchForm({ vehicle_label: e.target.value })}
                      />
                    </Field>
                    <Field label="Pick-up">
                      <Input
                        value={form.pickup}
                        onChange={(e) => patchForm({ pickup: e.target.value })}
                      />
                    </Field>
                    <Field label="Drop-off">
                      <Input
                        value={form.dropoff}
                        onChange={(e) => patchForm({ dropoff: e.target.value })}
                      />
                    </Field>
                  </div>
                </TabsContent>

                <TabsContent value="days" className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Tour title">
                      <Input
                        value={form.tour_title}
                        onChange={(e) => patchForm({ tour_title: e.target.value })}
                      />
                    </Field>
                    <Field label="Subtitle">
                      <Input
                        value={form.tour_subtitle}
                        onChange={(e) => patchForm({ tour_subtitle: e.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="space-y-3">
                    {form.days.map((day, index) => (
                      <div
                        key={`day-${index}`}
                        className="space-y-2 rounded-md border border-border p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                            Day {day.day}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={index === 0}
                              onClick={() => moveDay(index, -1)}
                              aria-label="Move up"
                            >
                              <GripVertical className="size-3.5 rotate-90" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-signal"
                              disabled={form.days.length <= 1}
                              onClick={() => removeDay(index)}
                              aria-label="Remove day"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Field label="Title">
                            <ComboTextField
                              value={day.title}
                              onChange={(v) => updateDay(index, { title: v })}
                              options={dayTitleOptions}
                              placeholder="Select or type day title"
                              emptyHint="No itinerary match — keep typing (quote only, not saved to master)"
                            />
                          </Field>
                          <Field label="Date">
                            <DatePicker
                              value={day.date || ""}
                              onChange={(v) => updateDay(index, { date: v })}
                              placeholder="Optional date"
                            />
                          </Field>
                          <Field label="Distance / time">
                            <Input
                              value={day.distance || ""}
                              onChange={(e) => updateDay(index, { distance: e.target.value })}
                              placeholder="120 km / 3 - 4 hrs"
                            />
                          </Field>
                          <Field label="Stay">
                            <Input
                              value={day.stay || ""}
                              onChange={(e) => updateDay(index, { stay: e.target.value })}
                              placeholder="Shimla"
                            />
                          </Field>
                          <Field label="Detail" className="sm:col-span-2">
                            <Textarea
                              rows={2}
                              value={day.detail}
                              onChange={(e) => updateDay(index, { detail: e.target.value })}
                            />
                          </Field>
                          <Field label="Highlights (one per line)" className="sm:col-span-2">
                            <Textarea
                              rows={2}
                              value={listToLines(day.highlights)}
                              onChange={(e) =>
                                updateDay(index, { highlights: linesToList(e.target.value) })
                              }
                              placeholder={"Mall Road\nChrist Church\nThe Ridge"}
                            />
                          </Field>
                          <Field label="Overnight" className="sm:col-span-2">
                            <Input
                              value={day.overnight || ""}
                              onChange={(e) => updateDay(index, { overnight: e.target.value })}
                              placeholder="Overnight stay in Shimla."
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addDay}>
                    <Plus className="size-3.5" /> Add day
                  </Button>
                </TabsContent>

                <TabsContent value="hotels" className="space-y-3">
                  <p className="text-xs text-slate-soft">
                    Hotel details & rates appear on the quote PDF. Leave empty to hide the section.
                  </p>
                  {(form.hotels ?? []).map((hotel, index) => (
                    <div
                      key={`hotel-${index}`}
                      className="space-y-2 rounded-md border border-border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                          Hotel {index + 1}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-signal"
                          onClick={() => removeHotel(index)}
                          aria-label="Remove hotel"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Field label="Location / destination">
                          <Input
                            value={hotel.location}
                            onChange={(e) => updateHotel(index, { location: e.target.value })}
                            placeholder="Shimla"
                          />
                        </Field>
                        <Field label="Hotel name">
                          <ComboTextField
                            value={hotel.hotel_name}
                            onChange={(v) => updateHotel(index, { hotel_name: v })}
                            options={hotelNameOptions}
                            onPick={(option) => {
                              const template = state.hotelTemplates.find(
                                (h) => h.id === option.value
                              );
                              if (!template) {
                                updateHotel(index, { hotel_name: option.label });
                                return;
                              }
                              // Copy into this quote only — does not update hotel master.
                              updateHotel(index, {
                                hotel_name: template.name,
                                location: hotel.location || template.city || "",
                                category: hotel.category || template.defaultRoomType || "",
                                rate:
                                  hotel.rate ||
                                  (template.typicalRate
                                    ? `₹${template.typicalRate.toLocaleString("en-IN")}`
                                    : ""),
                                notes: hotel.notes || template.notes || "",
                              });
                            }}
                            placeholder="Select or type hotel name"
                            emptyHint="No hotel match — keep typing (quote only, not saved to master)"
                          />
                        </Field>
                        <Field label="Category / room type">
                          <Input
                            value={hotel.category || ""}
                            onChange={(e) => updateHotel(index, { category: e.target.value })}
                            placeholder="Deluxe / Standard"
                          />
                        </Field>
                        <Field label="Nights">
                          <Input
                            value={hotel.nights ?? ""}
                            onChange={(e) => updateHotel(index, { nights: e.target.value })}
                            placeholder="2"
                          />
                        </Field>
                        <Field label="Rooms">
                          <Input
                            value={hotel.rooms ?? ""}
                            onChange={(e) => updateHotel(index, { rooms: e.target.value })}
                            placeholder="3"
                          />
                        </Field>
                        <Field label="Rate">
                          <Input
                            value={hotel.rate || ""}
                            onChange={(e) => updateHotel(index, { rate: e.target.value })}
                            placeholder="₹4,500 / night or package share"
                          />
                        </Field>
                        <Field label="Notes" className="sm:col-span-2">
                          <Input
                            value={hotel.notes || ""}
                            onChange={(e) => updateHotel(index, { notes: e.target.value })}
                            placeholder="MAP · similar category"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addHotel}>
                    <Plus className="size-3.5" /> Add hotel
                  </Button>
                </TabsContent>

                <TabsContent value="package" className="space-y-3">
                  <Field label="Greeting">
                    <Input
                      value={form.greeting}
                      onChange={(e) => patchForm({ greeting: e.target.value })}
                    />
                  </Field>
                  <Field label="Intro text">
                    <Textarea
                      rows={3}
                      value={form.intro_text}
                      onChange={(e) => patchForm({ intro_text: e.target.value })}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Company contact name">
                      <Input
                        value={form.company_contact_name}
                        onChange={(e) => patchForm({ company_contact_name: e.target.value })}
                      />
                    </Field>
                    <Field label="Company contact phone">
                      <Input
                        value={form.company_contact_phone}
                        onChange={(e) => patchForm({ company_contact_phone: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Inclusions (one per line)">
                    <Textarea
                      rows={4}
                      value={listToLines(form.inclusions)}
                      onChange={(e) => patchForm({ inclusions: linesToList(e.target.value) })}
                    />
                  </Field>
                  <Field label="Exclusions (one per line)">
                    <Textarea
                      rows={3}
                      value={listToLines(form.exclusions)}
                      onChange={(e) => patchForm({ exclusions: linesToList(e.target.value) })}
                    />
                  </Field>
                  <Field label="Terms">
                    <Textarea
                      rows={3}
                      value={form.terms}
                      onChange={(e) => patchForm({ terms: e.target.value })}
                    />
                  </Field>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-3">
                  <Field label="Quote amount (₹)">
                    <Input
                      type="number"
                      min={0}
                      value={form.amount}
                      onChange={(e) => patchForm({ amount: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Amount note">
                    <Input
                      value={form.amount_note}
                      onChange={(e) => patchForm({ amount_note: e.target.value })}
                      placeholder="All inclusive for 10 adults…"
                    />
                  </Field>
                  <Field label="Internal note">
                    <Textarea
                      rows={3}
                      value={form.note}
                      onChange={(e) => patchForm({ note: e.target.value })}
                      placeholder="Ops notes — not always shown on PDF"
                    />
                  </Field>
                  <div className="rounded-md border border-marigold bg-marigold-soft px-3 py-2 text-sm text-marigold-ink">
                    Send marks the lead Hot and sends the Meta WhatsApp template{" "}
                    <span className="font-mono">quote_proposal</span> with a link to this proposal.
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetBody>

        <SheetFooter className="sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={!form || saving || sending || loading}
              onClick={() => void handleSaveDraft()}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Save draft
            </Button>
            {lead ? (
              <Button asChild variant="ghost" size="sm">
                <a href={proposalHref} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" /> Preview PDF
                </a>
              </Button>
            ) : null}
          </div>
          <Button
            variant="marigold"
            disabled={!form || saving || sending || loading || !phoneOk}
            onClick={() => void handleSend()}
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send quote
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
