"use client";

import * as React from "react";
import { BedDouble, Plus, Trash2 } from "lucide-react";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { HotelTemplateFormDialog } from "@/components/crm/hotel-template-form-dialog";
import { useData } from "@/lib/store";
import {
  ItineraryDay,
  ItineraryStatus,
  ItineraryTemplate,
  renumberItineraryDays,
} from "@/lib/data";

const statuses: ItineraryStatus[] = ["Active", "Draft", "Archived"];

export type ItineraryFormState = Omit<ItineraryTemplate, "id" | "updatedAt">;

const emptyDay = (day: number): ItineraryDay => ({
  day,
  title: "",
  detail: "",
});

export const emptyItineraryForm: ItineraryFormState = {
  name: "",
  tourPackage: "",
  subtitle: "",
  nights: 1,
  days: 2,
  overview: "",
  inclusions: ["Private cab", "Driver", "Fuel"],
  startingFrom: 8000,
  daysPlan: [emptyDay(1), emptyDay(2)],
  status: "Draft",
};

function syncDuration(daysPlan: ItineraryDay[]) {
  const days = Math.max(daysPlan.length, 1);
  return { days, nights: Math.max(days - 1, 0) };
}

export function ItineraryFormDialog({
  open,
  onOpenChange,
  itinerary,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itinerary?: ItineraryTemplate | null;
  onSubmit: (data: ItineraryFormState) => void;
}) {
  const { state, addHotelTemplate } = useData();
  const [form, setForm] = React.useState<ItineraryFormState>(emptyItineraryForm);
  const [inclusionsText, setInclusionsText] = React.useState("");
  const [error, setError] = React.useState("");
  const [addHotelOpen, setAddHotelOpen] = React.useState(false);
  const [targetDayIndex, setTargetDayIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (itinerary) {
      const { id: _id, updatedAt: _u, ...rest } = itinerary;
      setForm({
        ...rest,
        inclusions: [...rest.inclusions],
        daysPlan: rest.daysPlan.map((d) => ({ ...d })),
      });
      setInclusionsText(rest.inclusions.join(", "));
    } else {
      setForm(emptyItineraryForm);
      setInclusionsText(emptyItineraryForm.inclusions.join(", "));
    }
    setError("");
  }, [open, itinerary]);

  function setDay(index: number, patch: Partial<ItineraryDay>) {
    setForm((f) => {
      const daysPlan = f.daysPlan.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...f, daysPlan, ...syncDuration(daysPlan) };
    });
  }

  function addDay() {
    setForm((f) => {
      const daysPlan = renumberItineraryDays([...f.daysPlan, emptyDay(f.daysPlan.length + 1)]);
      return { ...f, daysPlan, ...syncDuration(daysPlan) };
    });
  }

  function removeDay(index: number) {
    setForm((f) => {
      if (f.daysPlan.length <= 1) return f;
      const daysPlan = renumberItineraryDays(f.daysPlan.filter((_, i) => i !== index));
      return { ...f, daysPlan, ...syncDuration(daysPlan) };
    });
  }

  function moveDay(index: number, dir: -1 | 1) {
    setForm((f) => {
      const next = index + dir;
      if (next < 0 || next >= f.daysPlan.length) return f;
      const copy = [...f.daysPlan];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      const daysPlan = renumberItineraryDays(copy);
      return { ...f, daysPlan, ...syncDuration(daysPlan) };
    });
  }

  function handleSubmit() {
    const name = form.name.trim();
    if (!name) {
      setError("Template name is required.");
      return;
    }
    if (!form.tourPackage.trim()) {
      setError("Tour package is required.");
      return;
    }
    if (form.daysPlan.length < 1) {
      setError("Add at least one day.");
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
    onSubmit({
      ...form,
      name,
      tourPackage: form.tourPackage.trim(),
      subtitle: form.subtitle.trim(),
      overview: form.overview.trim(),
      inclusions: inclusions.length ? inclusions : ["Private cab"],
      daysPlan: renumberItineraryDays(
        form.daysPlan.map((d) => ({
          ...d,
          title: d.title.trim(),
          detail: d.detail.trim(),
        }))
      ),
      ...syncDuration(form.daysPlan),
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{itinerary ? "Edit itinerary template" : "New itinerary template"}</SheetTitle>
          <SheetDescription>
            Master templates are reusable. Guest customizations never change this original.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <Field label="Template name">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Majestic Shimla Manali"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tour package">
              <Input
                value={form.tourPackage}
                onChange={(e) => setForm((f) => ({ ...f, tourPackage: e.target.value }))}
                placeholder="e.g. 5N/6D Shimla Manali Taxi Tour"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as ItineraryStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Subtitle">
            <Input
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Short tagline"
            />
          </Field>

          <Field label="Overview">
            <RichTextEditor
              value={form.overview}
              onChange={(v) => setForm((f) => ({ ...f, overview: v }))}
              placeholder="Tour overview for proposals…"
              minHeight="90px"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting from (₹)">
              <Input
                type="number"
                min={0}
                value={form.startingFrom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startingFrom: Number(e.target.value) || 0 }))
                }
              />
            </Field>
            <Field label="Duration" hint="Auto from day plan">
              <Input
                readOnly
                value={`${form.nights}N / ${form.days}D`}
                className="bg-secondary/50"
              />
            </Field>
          </div>

          <Field label="Inclusions" hint="Rich text / bullet points supported">
            <RichTextEditor
              value={inclusionsText}
              onChange={(v) => setInclusionsText(v)}
              placeholder="Hotel stay, Private cab, Sightseeing..."
              minHeight="70px"
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink-text">Day-wise plan</p>
              <Button type="button" variant="outline" size="sm" onClick={addDay}>
                <Plus className="size-3.5" /> Add day
              </Button>
            </div>
            <div className="space-y-3">
              {form.daysPlan.map((day, index) => (
                <div
                  key={`day-${index}`}
                  className="rounded-md border border-border bg-[#f8f9fc] p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-mono-data text-[11px] font-semibold uppercase tracking-wide text-slate">
                      Day {day.day}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-signal"
                      disabled={form.daysPlan.length <= 1}
                      onClick={() => removeDay(index)}
                      aria-label="Remove day"
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
                    <RichTextEditor
                      value={day.detail}
                      onChange={(v) => setDay(index, { detail: v })}
                      placeholder="Day plan description & activities…"
                      minHeight="75px"
                    />

                    <div className="pt-1">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-[11px] font-medium text-slate">
                          Overnight Hotel Stay
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1 text-[11px] text-teal hover:text-teal-dark"
                          onClick={() => {
                            setTargetDayIndex(index);
                            setAddHotelOpen(true);
                          }}
                        >
                          <Plus className="size-3" /> Add New Hotel
                        </Button>
                      </div>
                      <Select
                        value={day.hotelId || (day.hotelName ? `name:${day.hotelName}` : "none")}
                        onValueChange={(val) => {
                          if (val === "none") {
                            setDay(index, { hotelId: undefined, hotelName: undefined });
                          } else if (val.startsWith("name:")) {
                            const name = val.replace("name:", "");
                            setDay(index, { hotelId: undefined, hotelName: name });
                          } else {
                            const found = state.hotelTemplates.find((h) => h.id === val);
                            setDay(index, { hotelId: val, hotelName: found?.name });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue placeholder="-- Select Hotel Stay --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Hotel Assigned</SelectItem>
                          {state.hotelTemplates.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              🏨 {h.name} ({h.city} · {h.defaultRoomType || "Standard"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {index < form.daysPlan.length - 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 px-2 text-[11px] text-slate"
                      onClick={() => moveDay(index, 1)}
                    >
                      Move down
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {error ? <p className="text-xs text-signal">{error}</p> : null}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="marigold" onClick={handleSubmit}>
            {itinerary ? "Save template" : "Create template"}
          </Button>
        </SheetFooter>
      </SheetContent>

      <HotelTemplateFormDialog
        open={addHotelOpen}
        onOpenChange={setAddHotelOpen}
        onSubmit={(hotelData) => {
          addHotelTemplate(hotelData);
          if (targetDayIndex !== null) {
            setDay(targetDayIndex, {
              hotelName: hotelData.name,
            });
          }
        }}
      />
    </Sheet>
  );
}
