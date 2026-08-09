"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { DatePicker } from "@/components/crm/date-picker";
import { AdPlatform, AdSpendEntry, trackedWebsites } from "@/lib/data";

const platforms: AdPlatform[] = [
  "Google Ads",
  "Meta Ads",
  "Website SEO",
  "Offline / Print",
  "Other",
];

type FormState = Omit<AdSpendEntry, "id" | "createdAt">;

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const empty: FormState = {
  platform: "Google Ads",
  website: "mahasutravels.com",
  amount: 10000,
  date: todayISO(),
  campaignName: "",
  leadsGenerated: 0,
  notes: "",
};

export function AdSpendDialog({
  trigger,
  spend,
  onSubmit,
}: {
  trigger: React.ReactNode;
  spend?: AdSpendEntry;
  onSubmit: (data: FormState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(spend ?? empty);

  React.useEffect(() => {
    if (open) setForm(spend ?? empty);
  }, [open, spend]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (form.amount <= 0) return;
    onSubmit(form);
    setOpen(false);
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{spend ? "Edit Ad Spend Entry" : "Log New Ad Spend"}</DialogTitle>
            <DialogDescription>
              Record money spent on Google Ads, Meta Ads, or marketing campaigns.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
            <Field label="Ad Platform" className="sm:col-span-2">
              <Select value={form.platform} onValueChange={(v) => set("platform", v as AdPlatform)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Website Domain" className="sm:col-span-2">
              <Select value={form.website || "mahasutravels.com"} onValueChange={(v) => set("website", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {trackedWebsites.map((w) => (
                    <SelectItem key={w.id} value={w.name}>
                      {w.icon} {w.name} ({w.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Amount Spent (₹)">
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => set("amount", Number(e.target.value))}
                placeholder="25000"
              />
            </Field>

            <Field label="Spend Date">
              <DatePicker
                value={form.date}
                onChange={(v) => set("date", v)}
                placeholder="Select date"
              />
            </Field>

            <Field label="Campaign Name" className="sm:col-span-2">
              <Input
                value={form.campaignName ?? ""}
                onChange={(e) => set("campaignName", e.target.value)}
                placeholder="e.g. Summer Himachal Search Ads 2026"
              />
            </Field>

            <Field label="Leads Generated (optional)">
              <Input
                type="number"
                min={0}
                value={form.leadsGenerated ?? 0}
                onChange={(e) => set("leadsGenerated", Number(e.target.value))}
              />
            </Field>

            <Field label="Notes / Performance" className="sm:col-span-2">
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Add budget notes, CPL details, targeting notes..."
                rows={2}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="marigold" onClick={submit}>
              {spend ? "Save Changes" : "Log Ad Spend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
