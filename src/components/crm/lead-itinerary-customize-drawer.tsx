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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { HotelTemplateFormDialog } from "@/components/crm/hotel-template-form-dialog";
import { useData } from "@/lib/store";
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
  const { state, addHotelTemplate } = useData();
  const [form, setForm] = React.useState<LeadCustomItinerary | null>(null);
  const [inclusionsText, setInclusionsText] = React.useState("");
  const [error, setError] = React.useState("");
  const [addHotelOpen, setAddHotelOpen] = React.useState(false);
  const [targetDayIndex, setTargetDayIndex] = React.useState<number | null>(null);

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
                <RichTextEditor
                  value={form.overview}
                  onChange={(v) => setForm((f) => (f ? { ...f, overview: v } : f))}
                  placeholder="Overview details..."
                  minHeight="90px"
                />
              </Field>
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
                {form.daysPlan.map((day, index) => (
                  <div
                    key={`guest-day-${index}`}
                    className="rounded-md border border-border bg-wash p-3"
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
                                🏨 {h.name} ({h.city} · {h.defaultRoomType || "Standard"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
