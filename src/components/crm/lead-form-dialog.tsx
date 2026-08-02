"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import {
  Lead,
  LeadStatus,
  tourPackages,
  pickupLocations,
  cabFleet,
  estimateCabPrice,
} from "@/lib/data";

const sources: Lead["source"][] = ["Website", "Google Ads", "Meta Ads", "Manual"];
const statuses: LeadStatus[] = ["New", "Contacted", "Quoted", "Follow-up", "Confirmed", "Lost"];
const agentsList = ["Aman", "Priya", "Sana"];

type FormState = Omit<Lead, "id">;

const empty: FormState = {
  name: "",
  email: "",
  city: "",
  phone: "",
  source: "Website",
  tourPackage: "Custom / Plan your trip",
  destination: "",
  pickup: "",
  dropoff: "",
  travelDate: "",
  returnDate: "",
  cabType: "Ertiga (6+1)",
  adults: 2,
  kids: 0,
  days: 2,
  tourPlan: "",
  status: "New",
  agent: "Aman",
  budget: estimateCabPrice("Ertiga (6+1)", 2),
  lastActivity: "Just now",
};

export function LeadFormDialog({
  trigger,
  lead,
  onSubmit,
}: {
  trigger: React.ReactNode;
  lead?: Lead;
  onSubmit: (data: FormState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(lead ?? empty);

  React.useEffect(() => {
    if (open) setForm(lead ?? empty);
  }, [open, lead]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "cabType" || key === "days") {
        const cabType = key === "cabType" ? (value as string) : next.cabType;
        const days = key === "days" ? (value as number) : next.days;
        next.budget = estimateCabPrice(cabType, days);
      }
      return next;
    });
  }

  function submit() {
    if (!form.name.trim() || !form.phone.trim()) return;
    onSubmit({ ...form, lastActivity: lead ? form.lastActivity : "Just now" });
    setOpen(false);
  }

  const rate = cabFleet.find((c) => c.name === form.cabType)?.ratePerDay;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit lead" : "Add new lead"}</DialogTitle>
          <DialogDescription>
            {lead
              ? `Updating ${lead.id}`
              : "Fields match Plan Your Trip + booking enquiry on mahasutravels.com"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate uppercase">About yourself</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ritika Sharma" />
              </Field>
              <Field label="Email ID">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="ritika@email.com"
                />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Delhi" />
              </Field>
              <Field label="Phone number">
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98170 22314" />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate uppercase">Your tour plan</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Destination" className="col-span-2">
                <Input
                  value={form.destination}
                  onChange={(e) => set("destination", e.target.value)}
                  placeholder="Shimla / Manali"
                />
              </Field>

              <Field label="Tour package" className="col-span-2">
                <Select value={form.tourPackage} onValueChange={(v) => set("tourPackage", v)}>
                  <SelectTrigger><SelectValue placeholder="-- Tour Packages --" /></SelectTrigger>
                  <SelectContent>
                    {tourPackages.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Date of travel">
                <Input
                  value={form.travelDate}
                  onChange={(e) => set("travelDate", e.target.value)}
                  placeholder="12 Aug 2026"
                />
              </Field>
              <Field label="Date of return">
                <Input
                  value={form.returnDate}
                  onChange={(e) => set("returnDate", e.target.value)}
                  placeholder="17 Aug 2026"
                />
              </Field>

              <Field label="Pick-up point">
                <Input
                  value={form.pickup}
                  onChange={(e) => set("pickup", e.target.value)}
                  placeholder="Delhi / Chandigarh"
                  list="lead-pickup-suggestions"
                />
                <datalist id="lead-pickup-suggestions">
                  {pickupLocations.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </Field>
              <Field label="Drop-off point">
                <Input
                  value={form.dropoff}
                  onChange={(e) => set("dropoff", e.target.value)}
                  placeholder="Same as pickup / destination"
                />
              </Field>

              <Field label="Adults">
                <Input
                  type="number"
                  min={1}
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

              <Field label="Select a cab" className="col-span-2 sm:col-span-1">
                <Select value={form.cabType} onValueChange={(v) => set("cabType", v)}>
                  <SelectTrigger><SelectValue placeholder="--- Select Cab ---" /></SelectTrigger>
                  <SelectContent>
                    {cabFleet.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
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

              <Field label="Tour plan in brief" className="col-span-2">
                <Textarea
                  value={form.tourPlan}
                  onChange={(e) => set("tourPlan", e.target.value)}
                  placeholder="Share preferred hotels, sightseeing, budget notes…"
                  rows={3}
                />
              </Field>

              <Field label="Estimated price (₹)">
                <Input
                  type="number"
                  min={0}
                  value={form.budget}
                  onChange={(e) => set("budget", Number(e.target.value))}
                />
                {rate ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ₹{rate.toLocaleString("en-IN")}/day × {form.days} day{form.days === 1 ? "" : "s"}
                  </p>
                ) : null}
              </Field>
              <Field label="Source">
                <Select value={form.source} onValueChange={(v) => set("source", v as Lead["source"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Assigned agent">
                <Select value={form.agent} onValueChange={(v) => set("agent", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {agentsList.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set("status", v as LeadStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="marigold" onClick={submit}>{lead ? "Save changes" : "Add lead"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
