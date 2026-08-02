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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/crm/field";
import { Driver } from "@/lib/data";

const vehicleTypes = ["Swift Dzire", "Ertiga", "Innova Crysta", "Tempo Traveller", "Sedan", "SUV"];
const fuelTypes: NonNullable<Driver["fuelType"]>[] = ["Petrol", "Diesel", "CNG", "Electric"];
const statuses: Driver["status"][] = ["Available", "On Trip", "Off Duty"];

type FormState = Omit<Driver, "id">;

const empty: FormState = {
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
  commission: 10,
  status: "Available",
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
  onSubmit: (data: FormState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(driver ?? empty);

  React.useEffect(() => {
    if (open) setForm(driver ?? empty);
  }, [open, driver]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.vehicle.trim()) return;
    onSubmit(form);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{driver ? "Edit driver & vehicle" : "Add driver & vehicle"}</DialogTitle>
          <DialogDescription>
            {driver ? `Updating ${driver.id}` : "Full profile including documents and commission"}
          </DialogDescription>
        </DialogHeader>

        <p className="font-mono-data text-[11px] uppercase tracking-wide text-slate-soft">Driver details</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" className="col-span-2 sm:col-span-1">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Suresh Thakur" />
          </Field>
          <Field label="Phone" className="col-span-2 sm:col-span-1">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 94180 22110" />
          </Field>
          <Field label="Address" className="col-span-2">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Sanjauli, Shimla, HP" />
          </Field>
          <Field label="Driving license no.">
            <Input value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} />
          </Field>
          <Field label="License expiry">
            <Input type="date" value={form.licenseExpiry} onChange={(e) => set("licenseExpiry", e.target.value)} />
          </Field>
          <Field label="Commission (%)">
            <Input
              type="number"
              min={0}
              max={100}
              value={form.commission}
              onChange={(e) => set("commission", Number(e.target.value))}
            />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v as Driver["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <p className="mt-2 font-mono-data text-[11px] uppercase tracking-wide text-slate-soft">Vehicle details</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vehicle number" className="col-span-2 sm:col-span-1">
            <Input value={form.vehicle} onChange={(e) => set("vehicle", e.target.value)} placeholder="HP-01-4521" />
          </Field>
          <Field label="Vehicle type" className="col-span-2 sm:col-span-1">
            <Select value={form.vehicleType} onValueChange={(v) => set("vehicleType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {vehicleTypes.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
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
            <Select value={form.fuelType} onValueChange={(v) => set("fuelType", v as Driver["fuelType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {fuelTypes.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="RC number">
            <Input value={form.rcNumber} onChange={(e) => set("rcNumber", e.target.value)} />
          </Field>
          <Field label="Insurance expiry">
            <Input type="date" value={form.insuranceExpiry} onChange={(e) => set("insuranceExpiry", e.target.value)} />
          </Field>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={form.vendor} onCheckedChange={(v) => set("vendor", v)} />
            <Label className="text-xs text-slate">Outsourced / vendor vehicle</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.documentsVerified} onCheckedChange={(v) => set("documentsVerified", v)} />
            <Label className="text-xs text-slate">Documents verified</Label>
          </div>
        </div>

        <Field label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Pending documents, preferences, remarks…"
          />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="marigold" onClick={submit}>{driver ? "Save changes" : "Add driver"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
