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
import { Checkbox } from "@/components/ui/checkbox";
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

export type AdSpendFormState = Omit<AdSpendEntry, "id" | "createdAt">;

function nowDateISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowTimeHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function emptyForm(): AdSpendFormState {
  return {
    platform: "Google Ads",
    website: "mahasutravels.com",
    amount: 10000,
    date: nowDateISO(),
    time: nowTimeHHMM(),
    campaignName: "",
    leadsGenerated: 0,
    notes: "",
  };
}

function formFromSpend(spend: AdSpendEntry): AdSpendFormState {
  return {
    platform: spend.platform,
    website: spend.website,
    amount: spend.amount,
    date: spend.date,
    time: spend.time || nowTimeHHMM(),
    campaignName: spend.campaignName,
    leadsGenerated: spend.leadsGenerated,
    notes: spend.notes,
  };
}

export function AdSpendDialog({
  trigger,
  spend,
  onSubmit,
}: {
  trigger: React.ReactNode;
  spend?: AdSpendEntry;
  onSubmit: (data: AdSpendFormState) => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<AdSpendFormState>(emptyForm);
  const [useCurrentDateTime, setUseCurrentDateTime] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (spend) {
      setForm(formFromSpend(spend));
      setUseCurrentDateTime(false);
    } else {
      setForm(emptyForm());
      setUseCurrentDateTime(true);
    }
    setError("");
  }, [open, spend]);

  function set<K extends keyof AdSpendFormState>(key: K, value: AdSpendFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyCurrentDateTime() {
    const next = { date: nowDateISO(), time: nowTimeHHMM() };
    setForm((f) => ({ ...f, ...next }));
    return next;
  }

  function onToggleCurrentDateTime(checked: boolean) {
    setUseCurrentDateTime(checked);
    if (checked) applyCurrentDateTime();
  }

  async function submit() {
    const payload = useCurrentDateTime
      ? { ...form, ...applyCurrentDateTime() }
      : form;
    if (payload.amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (!payload.date) {
      setError("Spend date is required");
      return;
    }
    if (!payload.time) {
      setError("Spend time is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(payload);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ad spend");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
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

            <Field label="Amount Spent (₹)" className="sm:col-span-2">
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => set("amount", Number(e.target.value))}
                placeholder="25000"
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-ink-text sm:col-span-2">
              <Checkbox
                checked={useCurrentDateTime}
                onCheckedChange={(v) => onToggleCurrentDateTime(v === true)}
              />
              Use current date & time
            </label>

            <Field label="Spend Date">
              <DatePicker
                value={form.date}
                onChange={(v) => set("date", v)}
                placeholder="Select date"
                className={useCurrentDateTime ? "pointer-events-none opacity-60" : undefined}
              />
            </Field>

            <Field label="Spend Time">
              <Input
                type="time"
                value={form.time ?? ""}
                onChange={(e) => set("time", e.target.value)}
                disabled={useCurrentDateTime}
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

          {error ? <p className="text-sm text-signal">{error}</p> : null}

          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="marigold" disabled={saving} onClick={() => void submit()}>
              {saving ? "Saving…" : spend ? "Save Changes" : "Log Ad Spend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
