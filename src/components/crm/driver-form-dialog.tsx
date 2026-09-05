"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Field } from "@/components/crm/field";
import { DrawerFormSkeleton, useDrawerReady } from "@/components/crm/skeletons";
import { DatePicker } from "@/components/crm/date-picker";
import { Driver } from "@/lib/data";
import {
  DRIVER_FORM_STATUS_OPTIONS,
  driverFormStatusValue,
} from "@/lib/driver-utils";
import { createVehicleTypeApi, fetchVehicleTypes } from "@/lib/vehicle-types-api";
import { useHasPermission } from "@/lib/use-has-permission";
import { useToast } from "@/lib/toast";

const fuelTypes: NonNullable<Driver["fuelType"]>[] = ["Petrol", "Diesel", "CNG", "Electric"];
const FALLBACK_VEHICLE_TYPES = [
  "Swift Dzire",
  "Ertiga",
  "Innova Crysta",
  "Tempo Traveller",
  "Sedan",
  "SUV",
];

export type DriverFormState = Omit<Driver, "id" | "driverNo">;

const empty: DriverFormState = {
  name: "",
  phone: "",
  address: "",
  vehicle: "",
  vehicleType: "",
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
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  driver?: Driver;
  onSubmit: (data: DriverFormState) => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const { toast } = useToast();
  const canCreateVehicleType = useHasPermission("drivers.and.vehicles.create");
  const [form, setForm] = React.useState<DriverFormState>(empty);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [vehicleTypes, setVehicleTypes] = React.useState<string[]>(FALLBACK_VEHICLE_TYPES);
  const [addTypeOpen, setAddTypeOpen] = React.useState(false);
  const [newTypeName, setNewTypeName] = React.useState("");
  const [addingType, setAddingType] = React.useState(false);
  const ready = useDrawerReady(open);

  const reloadVehicleTypes = React.useCallback(async () => {
    try {
      const rows = await fetchVehicleTypes({ activeOnly: true });
      const names = rows.map((r) => r.name).filter(Boolean);
      setVehicleTypes(names.length ? names : FALLBACK_VEHICLE_TYPES);
      return names;
    } catch {
      setVehicleTypes(FALLBACK_VEHICLE_TYPES);
      return FALLBACK_VEHICLE_TYPES;
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void reloadVehicleTypes().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [open, reloadVehicleTypes]);

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
    setAddTypeOpen(false);
    setNewTypeName("");
  }, [open, driver]);

  async function handleAddVehicleType() {
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      toast({
        variant: "error",
        title: "Name required",
        description: "Enter a vehicle type name.",
      });
      return;
    }
    setAddingType(true);
    try {
      const created = await createVehicleTypeApi({
        name: trimmed,
        sort_order: (vehicleTypes.length + 1) * 10,
      });
      await reloadVehicleTypes();
      set("vehicleType", created.name);
      setAddTypeOpen(false);
      setNewTypeName("");
      toast({
        variant: "success",
        title: "Vehicle type added",
        description: created.name,
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Could not add type",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setAddingType(false);
    }
  }

  function set<K extends keyof DriverFormState>(key: K, value: DriverFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.vehicle.trim()) {
      setError("Name, phone, and vehicle number are required.");
      return;
    }
    if (!form.vehicleType.trim()) {
      setError("Vehicle type is required.");
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
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        className="sm:max-w-lg"
        onFocusOutside={(e) => e.preventDefault()}
      >        <SheetHeader>
          <SheetTitle>{driver ? "Edit driver & vehicle" : "Add driver & vehicle"}</SheetTitle>
          <SheetDescription>
            {driver
              ? `Updating ${driver.driverNo}`
              : "Full profile including vehicle and documents"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {!ready ? (
            <DrawerFormSkeleton sections={3} fieldsPerSection={4} />
          ) : (
            <>
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
              <Select
                value={driverFormStatusValue(form.status)}
                onValueChange={(v) => set("status", v as Driver["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRIVER_FORM_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
              <div className="flex items-center gap-1.5">
                <Select
                  value={form.vehicleType || undefined}
                  onValueChange={(v) => set("vehicleType", v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const options = [...vehicleTypes];
                      if (form.vehicleType && !options.includes(form.vehicleType)) {
                        options.unshift(form.vehicleType);
                      }
                      return options.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
                {canCreateVehicleType ? (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-9 shrink-0"
                          aria-label="Add vehicle type"
                          onClick={() => {
                            setNewTypeName("");
                            setAddTypeOpen(true);
                          }}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Add vehicle type</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
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
            </>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={!ready || saving}>
            Cancel
          </Button>
          <Button variant="marigold" onClick={() => void submit()} disabled={!ready || saving}>
            {saving ? "Saving…" : driver ? "Save changes" : "Add driver"}
          </Button>
        </SheetFooter>
      </SheetContent>

      <Dialog open={addTypeOpen} onOpenChange={(v) => !addingType && setAddTypeOpen(v)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add vehicle type</DialogTitle>
            <DialogDescription>
              New types appear in this dropdown and in Vehicle types management.
            </DialogDescription>
          </DialogHeader>
          <Field label="Type name">
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g. Fortuner"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddVehicleType();
                }
              }}
            />
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={addingType}
              onClick={() => setAddTypeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="marigold"
              disabled={addingType}
              onClick={() => void handleAddVehicleType()}
            >
              {addingType ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Add type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
