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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/crm/field";
import { DatePicker } from "@/components/crm/date-picker";
import { Driver } from "@/lib/data";
import { Loader2 } from "lucide-react";

const statuses: Driver["status"][] = ["Approved", "Rejected", "Deactivated"];
const fuelTypes: NonNullable<Driver["fuelType"]>[] = ["Petrol", "Diesel", "CNG", "Electric"];
const vehicleTypes = ["Swift Dzire", "Ertiga", "Innova Crysta", "Tempo Traveller", "Sedan", "SUV"];

export type DriverFormState = Omit<Driver, "id" | "driverNo">;

const empty: DriverFormState = {
  name: "",
  phone: "",
  address: "",
  vehicle: "",
  vehicleType: "Innova Crysta",
  vehicleCapacity: 7,
  fuelType: "Diesel",
  licenseNumber: "",
  licenseExpiry: "",
  rcNumber: "",
  insuranceExpiry: "",
  pollutionExpiry: "",
  status: "Approved",
  rating: 5,
  trips: 0,
  vendor: false,
  documentsVerified: false,
  notes: "",
};

export function DriverFormDialog({
  trigger,
  driver,
  onSubmit,
}: {
  trigger: React.ReactNode;
  driver?: Driver;
  onSubmit: (data: DriverFormState) => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<DriverFormState>(empty);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (driver) {
      const { id: _id, driverNo: _no, ...rest } = driver;
      setForm({
        ...empty,
        ...rest,
        address: rest.address ?? "",
        licenseNumber: rest.licenseNumber ?? "",
        licenseExpiry: rest.licenseExpiry ?? "",
        rcNumber: rest.rcNumber ?? "",
        insuranceExpiry: rest.insuranceExpiry ?? "",
        pollutionExpiry: rest.pollutionExpiry ?? "",
        notes: rest.notes ?? "",
        vendor: rest.vendor ?? false,
        documentsVerified: rest.documentsVerified ?? false,
      });
    } else {
      setForm(empty);
    }
    setError("");
    setSaving(false);
  }, [open, driver]);

  function set<K extends keyof DriverFormState>(key: K, value: DriverFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.vehicle.trim()) {
      setError("Name, phone, and vehicle number are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address?.trim() ?? "",
        vehicle: form.vehicle.trim(),
        vehicleType: form.vehicleType.trim(),
        licenseNumber: form.licenseNumber?.trim() ?? "",
        rcNumber: form.rcNumber?.trim() ?? "",
        notes: form.notes?.trim() ?? "",
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save driver.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        setOpen(next);
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{driver ? "Edit driver & vehicle" : "Add driver & vehicle"}</SheetTitle>
          <SheetDescription>
            {driver
              ? `Updating ${driver.driverNo}`
              : "Full profile including vehicle and documents"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <p className="font-mono-data text-[11px] uppercase tracking-wide text-slate-soft">
            Driver details
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Suresh Thakur"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 94180 22110"
              />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Sanjauli, Shimla, HP"
              />
            </Field>
            <Field label="Driving license no.">
              <Input
                value={form.licenseNumber}
                onChange={(e) => set("licenseNumber", e.target.value)}
              />
            </Field>
            <Field label="License expiry">
              <DatePicker
                value={form.licenseExpiry}
                onChange={(v) => set("licenseExpiry", v)}
                placeholder="Select license expiry"
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v as Driver["status"])}>
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

          <p className="font-mono-data text-[11px] uppercase tracking-wide text-slate-soft">
            Vehicle details
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Vehicle number">
              <Input
                value={form.vehicle}
                onChange={(e) => set("vehicle", e.target.value)}
                placeholder="HP-01-4521"
              />
            </Field>
            <Field label="Vehicle type">
              <Select value={form.vehicleType} onValueChange={(v) => set("vehicleType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Seating capacity">
              <Input
                type="number"
                min={1}
                value={form.vehicleCapacity}
                onChange={(e) => set("vehicleCapacity", Number(e.target.value))}
              />
            </Field>
            <Field label="Fuel type">
              <Select
                value={form.fuelType || "Diesel"}
                onValueChange={(v) => set("fuelType", v as Driver["fuelType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="RC number">
              <Input value={form.rcNumber} onChange={(e) => set("rcNumber", e.target.value)} />
            </Field>
            <Field label="Insurance expiry">
              <DatePicker
                value={form.insuranceExpiry}
                onChange={(v) => set("insuranceExpiry", v)}
                placeholder="Select insurance expiry"
              />
            </Field>
            <Field label="Pollution expiry (optional)">
              <DatePicker
                value={form.pollutionExpiry}
                onChange={(v) => set("pollutionExpiry", v)}
                placeholder="Select pollution expiry"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.vendor} onCheckedChange={(v) => set("vendor", v)} />
              <Label className="text-xs text-slate">Outsourced / vendor vehicle</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={!!form.documentsVerified}
                onCheckedChange={(v) => set("documentsVerified", v)}
              />
              <Label className="text-xs text-slate">Documents verified</Label>
            </div>
          </div>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Pending documents, preferences, remarks…"
              rows={3}
            />
          </Field>

          {error ? <p className="text-xs text-signal">{error}</p> : null}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="marigold" onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {saving ? "Saving…" : driver ? "Save changes" : "Add driver"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
