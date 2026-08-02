"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
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
import {
  ItineraryDay,
  LeadCustomItinerary,
  renumberItineraryDays,
} from "@/lib/data";

export function LeadItineraryCustomizeDrawer({
  open,
  onOpenChange,
  initial,
  guestName,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: LeadCustomItinerary | null;
  guestName?: string;
  onSave: (custom: LeadCustomItinerary) => void;
}) {
  const [form, setForm] = React.useState<LeadCustomItinerary | null>(null);
  const [inclusionsText, setInclusionsText] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open || !initial) return;
    setForm({
      ...initial,
      inclusions: [...initial.inclusions],
      daysPlan: initial.daysPlan.map((d) => ({ ...d })),
    });
    setInclusionsText(initial.inclusions.join(", "));
    setError("");
  }, [open, initial]);

  function setDay(index: number, patch: Partial<ItineraryDay>) {
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        daysPlan: f.daysPlan.map((d, i) => (i === index ? { ...d, ...patch } : d)),
      };
    });
  }

  function addDay() {
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        daysPlan: renumberItineraryDays([
          ...f.daysPlan,
          { day: f.daysPlan.length + 1, title: "", detail: "" },
        ]),
      };
    });
  }

  function removeDay(index: number) {
    setForm((f) => {
      if (!f || f.daysPlan.length <= 1) return f;
      return {
        ...f,
        daysPlan: renumberItineraryDays(f.daysPlan.filter((_, i) => i !== index)),
      };
    });
  }

  function handleSave() {
    if (!form) return;
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (form.daysPlan.some((d) => !d.title.trim())) {
      setError("Each day needs a title.");
      return;
    }
    const inclusions = inclusionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({
      ...form,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      overview: form.overview.trim(),
      inclusions: inclusions.length ? inclusions : form.inclusions,
      daysPlan: renumberItineraryDays(
        form.daysPlan.map((d) => ({
          ...d,
          title: d.title.trim(),
          detail: d.detail.trim(),
        }))
      ),
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Customize itinerary for guest</SheetTitle>
          <SheetDescription>
            {guestName
              ? `Editing a copy for ${guestName}. The master template is not changed.`
              : "Editing a guest copy. The master template is not changed."}
          </SheetDescription>
        </SheetHeader>

        {form ? (
          <>
            <SheetBody className="space-y-4">
              <Field label="Proposal title">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
                />
              </Field>
              <Field label="Subtitle">
                <Input
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => (f ? { ...f, subtitle: e.target.value } : f))}
                />
              </Field>
              <Field label="Overview">
                <Textarea
                  rows={3}
                  value={form.overview}
                  onChange={(e) => setForm((f) => (f ? { ...f, overview: e.target.value } : f))}
                />
              </Field>
              <Field label="Inclusions" hint="Comma-separated">
                <Input value={inclusionsText} onChange={(e) => setInclusionsText(e.target.value)} />
              </Field>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-ink-text">Day-wise plan</p>
                  <Button type="button" variant="outline" size="sm" onClick={addDay}>
                    <Plus className="size-3.5" /> Add day
                  </Button>
                </div>
                {form.daysPlan.map((day, index) => (
                  <div
                    key={`guest-day-${index}`}
                    className="rounded-md border border-border bg-[#f8f9fc] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-mono-data text-[11px] font-semibold uppercase text-slate">
                        Day {day.day}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-signal"
                        disabled={form.daysPlan.length <= 1}
                        onClick={() => removeDay(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={day.title}
                        onChange={(e) => setDay(index, { title: e.target.value })}
                        placeholder="Day title"
                      />
                      <Textarea
                        rows={2}
                        value={day.detail}
                        onChange={(e) => setDay(index, { detail: e.target.value })}
                        placeholder="Day details…"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {error ? <p className="text-xs text-signal">{error}</p> : null}
            </SheetBody>
            <SheetFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="marigold" onClick={handleSave}>
                Save guest itinerary
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
