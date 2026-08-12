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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { HotelTemplateFormDialog } from "@/components/crm/hotel-template-form-dialog";
import { useData } from "@/lib/store";
import {
  ItineraryDay,
  ItineraryStatus,
  ItineraryTemplate,
  itineraryPriceAfterDiscount,
  renumberItineraryDays,
} from "@/lib/data";
import { isValidSlug, slugify, suggestDurationFromPlan } from "@/lib/itinerary-utils";

const statuses: ItineraryStatus[] = ["Active", "Draft", "Archived"];

export type ItineraryFormState = Omit<ItineraryTemplate, "id" | "itineraryNo" | "updatedAt">;

const emptyDay = (day: number): ItineraryDay => ({
  day,
  title: "",
  detail: "",
});

export const emptyItineraryForm: ItineraryFormState = {
  name: "",
  slug: "",
  tourPackage: "",
  subtitle: "",
  nights: "1",
  days: "2",
  overview: "",
  inclusions: [],
  startingFrom: 8000,
  discountPercentage: 0,
  daysPlan: [emptyDay(1), emptyDay(2)],
  status: "Draft",
};

export function ItineraryFormDialog({
  open,
  onOpenChange,
  itinerary,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itinerary?: ItineraryTemplate | null;
  onSubmit: (data: ItineraryFormState) => void | Promise<void>;
}) {
  const { state, addHotelTemplate } = useData();
  const [form, setForm] = React.useState<ItineraryFormState>(emptyItineraryForm);
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [addHotelOpen, setAddHotelOpen] = React.useState(false);
  const [targetDayIndex, setTargetDayIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (itinerary) {
      const { id: _id, itineraryNo: _no, updatedAt: _u, ...rest } = itinerary;
      setForm({
        ...rest,
        discountPercentage: rest.discountPercentage ?? 0,
        inclusions: [...(rest.inclusions ?? [])],
        daysPlan: rest.daysPlan.map((d) => ({ ...d })),
      });
      setSlugTouched(true);
    } else {
      setForm(emptyItineraryForm);
      setSlugTouched(false);
    }
    setError("");
    setSaving(false);
  }, [open, itinerary]);

  function applyDuration(daysPlan: ItineraryDay[]) {
    return suggestDurationFromPlan(daysPlan);
  }

  function setDay(index: number, patch: Partial<ItineraryDay>) {
    setForm((f) => {
      const daysPlan = f.daysPlan.map((d, i) => (i === index ? { ...d, ...patch } : d));
      return { ...f, daysPlan, ...applyDuration(daysPlan) };
    });
  }

  function addDay() {
    setForm((f) => {
      const daysPlan = renumberItineraryDays([...f.daysPlan, emptyDay(f.daysPlan.length + 1)]);
      return { ...f, daysPlan, ...applyDuration(daysPlan) };
    });
  }

  function removeDay(index: number) {
    setForm((f) => {
      if (f.daysPlan.length <= 1) return f;
      const daysPlan = renumberItineraryDays(f.daysPlan.filter((_, i) => i !== index));
      return { ...f, daysPlan, ...applyDuration(daysPlan) };
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
      return { ...f, daysPlan, ...applyDuration(daysPlan) };
    });
  }

  async function handleSubmit() {
    const name = form.name.trim();
    if (!name) {
      setError("Template name is required.");
      return;
    }
    if (!form.tourPackage.trim()) {
      setError("Tour package is required.");
      return;
    }
    const slug = slugify(form.slug || name);
    if (!slug || !isValidSlug(slug)) {
      setError("Slug must be lowercase letters, numbers, and hyphens.");
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

    const duration = applyDuration(form.daysPlan);
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        name,
        slug,
        tourPackage: form.tourPackage.trim(),
        subtitle: form.subtitle.trim(),
        overview: form.overview.trim(),
        inclusions: [],
        nights: (form.nights || duration.nights).trim().slice(0, 255),
        days: (form.days || duration.days).trim().slice(0, 255),
        discountPercentage: Math.min(Math.max(form.discountPercentage || 0, 0), 100),
        daysPlan: renumberItineraryDays(
          form.daysPlan.map((d) => ({
            ...d,
            title: d.title.trim(),
            detail: d.detail.trim(),
          }))
        ),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
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
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  ...(!slugTouched ? { slug: slugify(name) } : {}),
                }));
              }}
              placeholder="e.g. Majestic Shimla Manali"
            />
          </Field>

          <Field label="Slug" hint="URL-safe unique key">
            <Input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
              }}
              placeholder="e.g. majestic-shimla-manali"
              className="font-mono-data text-sm"
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            <Field label="Discount (%)">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.discountPercentage}
                onChange={(e) => {
                  const raw = Number(e.target.value);
                  const next = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 100) : 0;
                  setForm((f) => ({ ...f, discountPercentage: next }));
                }}
              />
              {form.discountPercentage > 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  After discount: ₹
                  {itineraryPriceAfterDiscount(
                    form.startingFrom,
                    form.discountPercentage
                  ).toLocaleString("en-IN")}
                </p>
              ) : null}
            </Field>
            <Field label="Nights" hint="Auto from plan">
              <Input
                value={form.nights}
                onChange={(e) => setForm((f) => ({ ...f, nights: e.target.value.slice(0, 255) }))}
                placeholder="5"
              />
            </Field>
            <Field label="Days" hint="Auto from plan">
              <Input
                value={form.days}
                onChange={(e) => setForm((f) => ({ ...f, days: e.target.value.slice(0, 255) }))}
                placeholder="6"
              />
            </Field>
          </div>

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
                  className="rounded-md border border-border bg-wash p-3"
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
                        <SelectTrigger className="h-8 text-xs bg-card">
                          <SelectValue placeholder="-- Select Hotel Stay --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Hotel Assigned</SelectItem>
                          {state.hotelTemplates.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.name} ({h.city} · {h.defaultRoomType || "Standard"})
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="marigold" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Saving…" : itinerary ? "Save template" : "Create template"}
          </Button>
        </SheetFooter>
      </SheetContent>

      <HotelTemplateFormDialog
        open={addHotelOpen}
        onOpenChange={setAddHotelOpen}
        onSubmit={async (hotelData) => {
          const created = await addHotelTemplate(hotelData);
          if (targetDayIndex !== null) {
            setDay(targetDayIndex, {
              hotelId: created.id,
              hotelName: created.name,
            });
          }
        }}
      />
    </Sheet>
  );
}
