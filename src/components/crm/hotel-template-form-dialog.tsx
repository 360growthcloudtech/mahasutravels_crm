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
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { HotelTemplate, HotelTemplateStatus } from "@/lib/data";

const statuses: HotelTemplateStatus[] = ["Active", "Draft", "Archived"];

export type HotelTemplateFormState = Omit<HotelTemplate, "id" | "updatedAt">;

export const emptyHotelTemplateForm: HotelTemplateFormState = {
  name: "",
  city: "",
  address: "",
  contactNumber: "",
  defaultRoomType: "",
  typicalRate: 0,
  notes: "",
  status: "Draft",
};

export function HotelTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: HotelTemplate | null;
  onSubmit: (data: HotelTemplateFormState) => void;
}) {
  const [form, setForm] = React.useState<HotelTemplateFormState>(emptyHotelTemplateForm);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (template) {
      const { id: _id, updatedAt: _u, ...rest } = template;
      setForm({ ...rest });
    } else {
      setForm(emptyHotelTemplateForm);
    }
    setError("");
  }, [open, template]);

  function submit() {
    if (!form.name.trim()) {
      setError("Hotel name is required.");
      return;
    }
    if (!form.city.trim()) {
      setError("City is required.");
      return;
    }
    onSubmit({
      ...form,
      name: form.name.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      contactNumber: form.contactNumber.trim(),
      defaultRoomType: form.defaultRoomType.trim(),
      notes: form.notes.trim(),
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{template ? "Edit hotel template" : "New hotel template"}</SheetTitle>
          <SheetDescription>
            Master hotel records are reusable. Logging a stay on a booking copies these details — the
            original template is never changed.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <Field label="Hotel name">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Hotel Willow Banks"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Shimla"
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as HotelTemplateStatus }))}
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
          <Field label="Address">
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="The Mall, Shimla, HP"
            />
          </Field>
          <Field label="Contact number">
            <Input
              value={form.contactNumber}
              onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
              placeholder="+91 …"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default room type">
              <Input
                value={form.defaultRoomType}
                onChange={(e) => setForm((f) => ({ ...f, defaultRoomType: e.target.value }))}
                placeholder="Deluxe Mountain View"
              />
            </Field>
            <Field label="Typical rate (₹)" hint="Guide rate only">
              <Input
                type="number"
                min={0}
                value={form.typicalRate}
                onChange={(e) => setForm((f) => ({ ...f, typicalRate: Number(e.target.value) || 0 }))}
              />
            </Field>
          </div>
          <Field label="Ops notes">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Preferred floors, meal plans, call tips…"
            />
          </Field>
          {error ? <p className="text-xs text-signal">{error}</p> : null}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="marigold" onClick={submit}>
            {template ? "Save template" : "Create template"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
