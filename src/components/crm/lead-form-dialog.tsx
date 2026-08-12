"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { DatePicker } from "@/components/crm/date-picker";
import {
  Lead,
  tourPackages,
  pickupLocations,
  cabFleet,
  estimateCabPrice,
  leadCars,
} from "@/lib/data";
import { useData, type LeadFormValues } from "@/lib/store";

const carOptions = [...leadCars, ...cabFleet.map((c) => c.name)];

type FormState = LeadFormValues;

function emptyForm(defaults?: {
  source?: string;
  website?: string;
  status?: string;
}): FormState {
  return {
    name: "",
    email: "",
    city: "",
    phone: "",
    source: defaults?.source || "manual",
    website: defaults?.website || "mahasutravels.com",
    tourPackage: "Custom / Plan your trip",
    pickup: "",
    drop: "",
    pickupDate: "",
    dropDate: "",
    nextFollowUpDate: "",
    nextFollowUpTime: "",
    car: "sedan",
    adults: 2,
    kids: 0,
    days: 2,
    notes: "",
    status: defaults?.status || "New Lead",
    assignedToId: null,
    price: estimateCabPrice("sedan", 2),
  };
}

function fromLead(lead: Lead): FormState {
  return {
    name: lead.name,
    email: lead.email,
    city: lead.city,
    phone: lead.phone,
    source: lead.source || "manual",
    website: lead.website || "mahasutravels.com",
    tourPackage: lead.tourPackage || "Custom / Plan your trip",
    pickup: lead.pickup,
    drop: lead.drop,
    pickupDate: lead.pickupDate,
    dropDate: lead.dropDate,
    nextFollowUpDate: lead.nextFollowUpDate,
    nextFollowUpTime: lead.nextFollowUpTime,
    car: lead.car || "sedan",
    adults: lead.adults,
    kids: lead.kids,
    days: lead.days,
    notes: lead.notes,
    status: lead.status,
    assignedToId: lead.assignedTo?.id ?? null,
    price: lead.price,
  };
}

export function LeadFormDialog({
  trigger,
  lead,
  defaultWebsite,
  onSubmit,
}: {
  trigger: React.ReactNode;
  lead?: Lead;
  defaultWebsite?: string;
  onSubmit: (data: FormState) => void | Promise<void>;
}) {
  const { assignees, leadStatuses, leadSources, websites } = useData();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const masterSource = leadSources.find((s) => s.code === "manual")?.code || leadSources[0]?.code || "manual";
  const masterWebsite = websites[0]?.domain || "mahasutravels.com";
  const masterStatus = leadStatuses.find((s) => s.is_default)?.code || leadStatuses[0]?.code || "New Lead";
  const [form, setForm] = React.useState<FormState>(() =>
    emptyForm({ source: masterSource, website: defaultWebsite || masterWebsite, status: masterStatus })
  );

  React.useEffect(() => {
    if (!open) return;
    if (lead) {
      setForm(fromLead(lead));
      return;
    }
    setForm(
      emptyForm({
        source: masterSource,
        website: defaultWebsite || masterWebsite,
        status: masterStatus,
      })
    );
  }, [open, lead, defaultWebsite, masterSource, masterWebsite, masterStatus]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "car" || key === "days") {
        const car = key === "car" ? (value as string) : next.car;
        const days = key === "days" ? (value as number) : next.days;
        next.price = estimateCabPrice(car, days);
      }
      return next;
    });
  }

  async function submit() {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      await onSubmit(form);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const rate =
    cabFleet.find((c) => c.name === form.car)?.ratePerDay ??
    (form.car === "sedan" ? 2100 : form.car === "suv" ? 2800 : form.car === "innova" ? 4000 : undefined);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{lead ? "Edit lead" : "Add new lead"}</SheetTitle>
          <SheetDescription>
            {lead
              ? `Updating ${lead.leadNo}`
              : "Fields match website forms + taxi calculator ingest"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          <section className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate uppercase">About yourself</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Rahul Sharma" />
              </Field>
              <Field label="Email ID">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="rahul@gmail.com"
                />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Delhi" />
              </Field>
              <Field label="Phone number">
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate uppercase">Trip details</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tour package" className="sm:col-span-2">
                <Select value={form.tourPackage} onValueChange={(v) => set("tourPackage", v)}>
                  <SelectTrigger><SelectValue placeholder="-- Tour Packages --" /></SelectTrigger>
                  <SelectContent>
                    {tourPackages.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Pickup date">
                <DatePicker
                  value={form.pickupDate}
                  onChange={(v) => set("pickupDate", v)}
                  placeholder="Select pickup date"
                />
              </Field>
              <Field label="Drop date">
                <DatePicker
                  value={form.dropDate}
                  onChange={(v) => set("dropDate", v)}
                  placeholder="Select drop date"
                />
              </Field>

              <Field label="Pickup location">
                <Input
                  value={form.pickup}
                  onChange={(e) => set("pickup", e.target.value)}
                  placeholder="Shimla"
                  list="lead-pickup-suggestions"
                />
                <datalist id="lead-pickup-suggestions">
                  {pickupLocations.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </Field>
              <Field label="Drop location">
                <Input
                  value={form.drop}
                  onChange={(e) => set("drop", e.target.value)}
                  placeholder="Delhi"
                />
              </Field>

              <Field label="Adults">
                <Input
                  type="number"
                  min={0}
                  value={form.adults}
                  onChange={(e) => set("adults", Number(e.target.value))}
                />
              </Field>
              <Field label="Kids">
                <Input
                  type="number"
                  min={0}
                  value={form.kids}
                  onChange={(e) => set("kids", Number(e.target.value))}
                />
              </Field>

              <Field label="Car">
                <Select value={form.car} onValueChange={(v) => set("car", v)}>
                  <SelectTrigger><SelectValue placeholder="Select car" /></SelectTrigger>
                  <SelectContent>
                    {carOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === "sedan" || c === "suv" || c === "innova"
                          ? c.charAt(0).toUpperCase() + c.slice(1)
                          : c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Days">
                <Input
                  type="number"
                  min={1}
                  value={form.days}
                  onChange={(e) => set("days", Number(e.target.value))}
                />
              </Field>

              <Field label="Notes" className="sm:col-span-2">
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Share preferred hotels, sightseeing, budget notes…"
                  rows={3}
                />
              </Field>

              <Field label="Price (₹)">
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => set("price", Number(e.target.value))}
                />
                {rate ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ₹{rate.toLocaleString("en-IN")}/day × {form.days} day{form.days === 1 ? "" : "s"}
                  </p>
                ) : null}
              </Field>
              <Field label="Source">
                <Select value={form.source} onValueChange={(v) => set("source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leadSources.map((s) => (
                      <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Website domain">
                <Select value={form.website || masterWebsite} onValueChange={(v) => set("website", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {websites.map((w) => (
                      <SelectItem key={w.id} value={w.domain}>
                        {w.label} · {w.domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Assigned to">
                <Select
                  value={form.assignedToId || "unassigned"}
                  onValueChange={(v) => set("assignedToId", v === "unassigned" ? null : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignees.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map((s) => (
                      <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Next follow-up date">
                <DatePicker
                  value={form.nextFollowUpDate}
                  onChange={(v) => set("nextFollowUpDate", v)}
                  placeholder="Select follow-up date"
                />
              </Field>
              <Field label="Next follow-up time">
                <Input
                  type="time"
                  value={form.nextFollowUpTime}
                  onChange={(e) => set("nextFollowUpTime", e.target.value)}
                />
              </Field>
            </div>
          </section>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="marigold" disabled={saving} onClick={() => void submit()}>
            {lead ? "Save changes" : "Add lead"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
