"use client";

import * as React from "react";
import { BedDouble } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { Separator } from "@/components/ui/separator";
import { Booking, BookingStatus, Driver, Hotel } from "@/lib/data";

const statuses: BookingStatus[] = [
  "Advance Pending",
  "Advance Received",
  "Balance Pending",
  "Fully Paid",
  "Cancelled",
  "Refunded",
];
const cabTypes = ["Swift Dzire", "Ertiga", "Innova Crysta", "Tempo Traveller"];

type FormState = Omit<Booking, "id">;

const emptyHotel: Hotel = {
  hotelName: "",
  address: "",
  checkIn: "",
  checkOut: "",
  roomType: "",
  roomCount: 1,
  amount: 0,
  referenceNumber: "",
  contactNumber: "",
  notes: "",
};

function emptyForm(): FormState {
  return {
    customer: "",
    phone: "",
    route: "",
    travelDate: "",
    cabType: "Innova Crysta",
    driver: "",
    vehicle: "",
    total: 0,
    advance: 0,
    balance: 0,
    status: "Advance Pending",
  };
}

export function BookingFormDialog({
  trigger,
  booking,
  drivers,
  onSubmit,
}: {
  trigger: React.ReactNode;
  booking?: Booking;
  drivers: Driver[];
  onSubmit: (data: FormState) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(booking ?? emptyForm());
  const [hotelEnabled, setHotelEnabled] = React.useState(!!booking?.hotel);
  const [hotel, setHotel] = React.useState<Hotel>(booking?.hotel ?? emptyHotel);

  React.useEffect(() => {
    if (open) {
      setForm(booking ?? emptyForm());
      setHotelEnabled(!!booking?.hotel);
      setHotel(booking?.hotel ?? emptyHotel);
    }
  }, [open, booking]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setHotelField<K extends keyof Hotel>(key: K, value: Hotel[K]) {
    setHotel((h) => ({ ...h, [key]: value }));
  }

  function pickDriver(name: string) {
    const d = drivers.find((d) => d.name === name);
    set("driver", name);
    if (d) set("vehicle", d.vehicle);
  }

  function submit() {
    if (!form.customer.trim() || !form.route.trim()) return;
    const balance = Math.max(form.total - form.advance, 0);
    onSubmit({ ...form, balance, hotel: hotelEnabled ? hotel : undefined });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{booking ? "Edit booking" : "New booking"}</DialogTitle>
          <DialogDescription>
            {booking ? `Updating ${booking.id}` : "Confirm trip details, driver and payment"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Customer name" className="col-span-2 sm:col-span-1">
            <Input value={form.customer} onChange={(e) => set("customer", e.target.value)} placeholder="Ananya Rao" />
          </Field>
          <Field label="Phone" className="col-span-2 sm:col-span-1">
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 22109" />
          </Field>
          <Field label="Route" className="col-span-2">
            <Input value={form.route} onChange={(e) => set("route", e.target.value)} placeholder="Chandigarh → Shimla" />
          </Field>
          <Field label="Travel date">
            <Input value={form.travelDate} onChange={(e) => set("travelDate", e.target.value)} placeholder="18 Aug" />
          </Field>
          <Field label="Cab type">
            <Select value={form.cabType} onValueChange={(v) => set("cabType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {cabTypes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Driver">
            <Select value={form.driver} onValueChange={pickDriver}>
              <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.name}>{d.name} · {d.vehicle}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Vehicle" hint="Auto-filled from driver, editable">
            <Input value={form.vehicle} onChange={(e) => set("vehicle", e.target.value)} />
          </Field>

          <Field label="Total amount (₹)">
            <Input type="number" min={0} value={form.total} onChange={(e) => set("total", Number(e.target.value))} />
          </Field>
          <Field label="Advance received (₹)">
            <Input type="number" min={0} value={form.advance} onChange={(e) => set("advance", Number(e.target.value))} />
          </Field>

          <Field label="Payment status" className="col-span-2">
            <Select value={form.status} onValueChange={(v) => set("status", v as BookingStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Separator className="my-1" />

        <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <BedDouble className="size-4 text-marigold-ink" />
            <div>
              <p className="text-xs font-medium text-ink-text">Assign hotel (optional)</p>
              <p className="text-[11px] text-slate-soft">Manual entry after confirming availability by phone</p>
            </div>
          </div>
          <Switch checked={hotelEnabled} onCheckedChange={setHotelEnabled} />
        </div>

        {hotelEnabled && (
          <div className="grid grid-cols-2 gap-3 rounded-md border border-dashed border-border p-3">
            <Field label="Hotel name" className="col-span-2 sm:col-span-1">
              <Input value={hotel.hotelName} onChange={(e) => setHotelField("hotelName", e.target.value)} placeholder="Hotel Willow Banks" />
            </Field>
            <Field label="Reference / booking no." className="col-span-2 sm:col-span-1">
              <Input value={hotel.referenceNumber} onChange={(e) => setHotelField("referenceNumber", e.target.value)} />
            </Field>
            <Field label="Address" className="col-span-2">
              <Input value={hotel.address} onChange={(e) => setHotelField("address", e.target.value)} placeholder="The Mall, Shimla, HP" />
            </Field>
            <Field label="Check-in">
              <Input type="date" value={hotel.checkIn} onChange={(e) => setHotelField("checkIn", e.target.value)} />
            </Field>
            <Field label="Check-out">
              <Input type="date" value={hotel.checkOut} onChange={(e) => setHotelField("checkOut", e.target.value)} />
            </Field>
            <Field label="Room type">
              <Input value={hotel.roomType} onChange={(e) => setHotelField("roomType", e.target.value)} placeholder="Deluxe Mountain View" />
            </Field>
            <Field label="Room count">
              <Input type="number" min={1} value={hotel.roomCount} onChange={(e) => setHotelField("roomCount", Number(e.target.value))} />
            </Field>
            <Field label="Hotel amount (₹)">
              <Input type="number" min={0} value={hotel.amount} onChange={(e) => setHotelField("amount", Number(e.target.value))} />
            </Field>
            <Field label="Hotel contact number">
              <Input value={hotel.contactNumber} onChange={(e) => setHotelField("contactNumber", e.target.value)} />
            </Field>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="marigold" onClick={submit}>{booking ? "Save changes" : "Create booking"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
