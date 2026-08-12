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
  pickupLocations,
  cabFleet,
  estimateCabPrice,
  leadCars,
} from "@/lib/data";
import { fetchActiveItineraryPackages, type ItineraryPackageApi } from "@/lib/itineraries-api";
import { isValidMobilePhone, todayDateOnly, tripDaysFromDates } from "@/lib/lead-utils";
import { useData, type LeadFormValues } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const carOptions = [...leadCars, ...cabFleet.map((c) => c.name)];

type FormState = LeadFormValues;

type FormErrors = {
  name?: string;
  phone?: string;
  pickupDate?: string;
  dropDate?: string;
  nextFollowUpDate?: string;
};

function applyTripDates(next: FormState, pickupDate: string, dropDate: string): FormState {
  const days = tripDaysFromDates(pickupDate, dropDate);
  next.pickupDate = pickupDate;
  next.dropDate = dropDate;
  if (days > 0) {
    next.days = days;
    next.price = estimateCabPrice(next.car, days);
  }
  return next;
}

function validateLeadForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Name is required";
  }

  if (!form.phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!isValidMobilePhone(form.phone)) {
    errors.phone = "Enter a valid 10-digit mobile number";
  }

  if (form.pickupDate && form.dropDate && form.dropDate < form.pickupDate) {
    errors.dropDate = "Drop date must be on or after pickup date";
  }

  if (form.nextFollowUpDate) {
    const today = todayDateOnly();
    if (form.nextFollowUpDate < today) {
      errors.nextFollowUpDate = "Follow-up date cannot be in the past";
    }
  }

  return errors;
}

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
    tourPackage: "",
    itineraryTemplateId: null,
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
    tourPackage: lead.tourPackage || "",
    itineraryTemplateId: lead.itineraryTemplateId || null,
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
  const { assignees, leadStatuses, leadSources, websites, state } = useData();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [packages, setPackages] = React.useState<ItineraryPackageApi[]>([]);
  const masterSource = leadSources.find((s) => s.code === "manual")?.code || leadSources[0]?.code || "manual";
  const masterWebsite = websites[0]?.domain || "mahasutravels.com";
  const masterStatus = leadStatuses.find((s) => s.is_default)?.code || leadStatuses[0]?.code || "New Lead";
  const [form, setForm] = React.useState<FormState>(() =>
    emptyForm({ source: masterSource, website: defaultWebsite || masterWebsite, status: masterStatus })
  );
  const today = todayDateOnly();

  React.useEffect(() => {
    if (!open) return;

    const fromStore = state.itineraries
      .filter((t) => t.status === "Active")
      .map((t) => ({ id: t.id, name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (fromStore.length > 0) {
      setPackages(fromStore);
      return;
    }

    let cancelled = false;
    void fetchActiveItineraryPackages()
      .then((rows) => {
        if (!cancelled) setPackages(rows);
      })
      .catch(() => {
        if (!cancelled) setPackages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, state.itineraries]);

  React.useEffect(() => {
    if (!open || packages.length === 0) return;
    setForm((f) => {
      if (f.itineraryTemplateId) return f;
      if (!f.tourPackage) return f;
      const match = packages.find((p) => p.name === f.tourPackage);
      if (!match) return f;
      return { ...f, itineraryTemplateId: match.id, tourPackage: match.name };
    });
  }, [open, packages]);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
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

  function clearError(key: keyof FormErrors) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (key === "name") clearError("name");
    if (key === "phone") clearError("phone");
    if (key === "pickupDate") {
      clearError("pickupDate");
      clearError("dropDate");
    }
    if (key === "dropDate") clearError("dropDate");
    if (key === "nextFollowUpDate") clearError("nextFollowUpDate");

    setForm((f) => {
      let next = { ...f, [key]: value };

      if (key === "pickupDate" && typeof value === "string") {
        const dropDate = next.dropDate && next.dropDate < value ? "" : next.dropDate;
        next = applyTripDates(next, value, dropDate);
        return next;
      }

      if (key === "dropDate" && typeof value === "string") {
        next = applyTripDates(next, next.pickupDate, value);
        return next;
      }

      if (key === "car") {
        next.price = estimateCabPrice(value as string, next.days || 1);
      }

      return next;
    });
  }

  function setTourPackage(packageId: string) {
    const pkg = packages.find((p) => p.id === packageId);
    setForm((f) => ({
      ...f,
      itineraryTemplateId: packageId,
      tourPackage: pkg?.name ?? f.tourPackage,
    }));
  }

  async function submit() {
    const nextErrors = validateLeadForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit(form);
      closeDrawer();
    } finally {
      setSaving(false);
    }
  }

  function closeDrawer() {
    setOpen(false);
    setErrors({});
  }

  const rate =
    cabFleet.find((c) => c.name === form.car)?.ratePerDay ??
    (form.car === "sedan" ? 2100 : form.car === "suv" ? 2800 : form.car === "innova" ? 4000 : undefined);

  const packageSelectValue = form.itineraryTemplateId || "";
  const legacyPackageLabel =
    form.tourPackage &&
    !form.itineraryTemplateId &&
    !packages.some((p) => p.name === form.tourPackage)
      ? form.tourPackage
      : null;
  const matchedByName =
    !form.itineraryTemplateId && form.tourPackage
      ? packages.find((p) => p.name === form.tourPackage)
      : undefined;
  const selectValue =
    packageSelectValue || matchedByName?.id || (legacyPackageLabel ? `legacy:${legacyPackageLabel}` : "");

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        // Only allow opening via trigger; dismiss is manual (X / Cancel).
        if (next) setOpen(true);
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        className="sm:max-w-lg"
        onClose={closeDrawer}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
              <Field label="Name" error={errors.name}>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Rahul Sharma"
                  className={cn(errors.name && "border-signal focus-visible:border-signal focus-visible:ring-signal/25")}
                />
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
              <Field label="Phone number" error={errors.phone}>
                <Input
                  value={form.phone}
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={15}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d+\s-]/g, "");
                    set("phone", raw);
                  }}
                  placeholder="9876543210"
                  className={cn(errors.phone && "border-signal focus-visible:border-signal focus-visible:ring-signal/25")}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate uppercase">Trip details</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tour package" className="sm:col-span-2">
                <Select
                  value={selectValue || undefined}
                  onValueChange={(v) => {
                    if (v.startsWith("legacy:")) return;
                    setTourPackage(v);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select tour package" /></SelectTrigger>
                  <SelectContent>
                    {legacyPackageLabel ? (
                      <SelectItem value={`legacy:${legacyPackageLabel}`} disabled>
                        {legacyPackageLabel} (legacy)
                      </SelectItem>
                    ) : null}
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Pickup date" error={errors.pickupDate}>
                <DatePicker
                  value={form.pickupDate}
                  onChange={(v) => set("pickupDate", v)}
                  placeholder="Select pickup date"
                  className={cn(errors.pickupDate && "border-signal")}
                />
              </Field>
              <Field label="Drop date" error={errors.dropDate}>
                <DatePicker
                  value={form.dropDate}
                  onChange={(v) => set("dropDate", v)}
                  placeholder="Select drop date"
                  minDate={form.pickupDate || undefined}
                  className={cn(errors.dropDate && "border-signal")}
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

              <Field label="Car" className="sm:col-span-2">
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
                {rate && form.days > 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ₹{rate.toLocaleString("en-IN")}/day × {form.days} day{form.days === 1 ? "" : "s"}
                    {form.pickupDate && form.dropDate ? " (from trip dates)" : ""}
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

              <Field label="Next follow-up date" error={errors.nextFollowUpDate}>
                <DatePicker
                  value={form.nextFollowUpDate}
                  onChange={(v) => set("nextFollowUpDate", v)}
                  placeholder="Select follow-up date"
                  minDate={today}
                  className={cn(errors.nextFollowUpDate && "border-signal")}
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
          <Button variant="outline" onClick={closeDrawer} disabled={saving}>
            Cancel
          </Button>
          <Button variant="marigold" disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {saving ? "Saving…" : lead ? "Save changes" : "Add lead"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
