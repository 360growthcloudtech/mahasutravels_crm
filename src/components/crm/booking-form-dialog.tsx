"use client";

import * as React from "react";
import { BedDouble } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { DatePicker } from "@/components/crm/date-picker";
import { Separator } from "@/components/ui/separator";
import {
  Booking,
  BookingStatus,
  Driver,
  Hotel,
  Lead,
  tourPackages,
  pickupLocations,
  cabFleet,
  estimateCabPrice,
} from "@/lib/data";

const sources: Lead["source"][] = ["Website", "Google Ads", "Meta Ads", "Manual"];
const agentsList = ["Aman", "Priya", "Sana"];
const statuses: BookingStatus[] = [
  "Advance Pending",
  "Advance Received",
  "Balance Pending",
  "Fully Paid",
  "Cancelled",
  "Refunded",
];

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
  const cabType = "Ertiga (6+1)";
  const days = 2;
  return {
    customer: "",
    email: "",
    city: "",
    phone: "",
    source: "Website",
    tourPackage: "Custom / Plan your trip",
    pickup: "",
    dropoff: "",
    travelDate: "",
    returnDate: "",
    cabType,
    adults: 2,
    kids: 0,
    days,
    tourPlan: "",
    agent: "Aman",
    driver: "",
    vehicle: "",
    total: estimateCabPrice(cabType, days),
    advance: 0,
    balance: estimateCabPrice(cabType, days),
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
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "cabType" || key === "days") {
        const cabType = key === "cabType" ? (value as string) : next.cabType;
        const days = key === "days" ? (value as number) : next.days;
        next.total = estimateCabPrice(cabType, days);
        next.balance = Math.max(next.total - next.advance, 0);
      }
      if (key === "total" || key === "advance") {
        const total = key === "total" ? (value as number) : next.total;
        const advance = key === "advance" ? (value as number) : next.advance;
        next.balance = Math.max(total - advance, 0);
      }
      return next;
    });
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
    if (!form.customer.trim() || !form.phone?.trim()) return;
    const balance = Math.max(form.total - form.advance, 0);
    onSubmit({
      ...form,
      balance,
      hotel: hotelEnabled ? hotel : undefined,
      comments: booking?.comments ?? form.comments,
      history: booking?.history ?? form.history,
    });
    setOpen(false);
  }

  const rate = cabFleet.find((c) => c.name === form.cabType)?.ratePerDay;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{booking ? "Edit booking" : "New booking"}</SheetTitle>
          <SheetDescription>
            {booking
              ? `Updating ${booking.id}`
              : "Same enquiry fields as leads, plus driver, payment and hotel"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          <section className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate uppercase">About yourself</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={form.customer}
                  onChange={(e) => set("customer", e.target.value)}
                  placeholder="Ritika Sharma"
                />
              </Field>
              <Field label="Email ID">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="ritika@email.com"
                />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Delhi" />
              </Field>
              <Field label="Phone number">
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98170 22314"
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate uppercase">Your tour plan</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tour package" className="sm:col-span-2">
                <Select value={form.tourPackage} onValueChange={(v) => set("tourPackage", v)}>
                  <SelectTrigger><SelectValue placeholder="-- Tour Packages --" /></SelectTrigger>
                  <SelectContent>
                    {tourPackages.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Date of travel">
                <DatePicker
                  value={form.travelDate}
                  onChange={(v) => set("travelDate", v)}
                  placeholder="Select travel date"
                />
              </Field>
              <Field label="Date of return">
                <DatePicker
                  value={form.returnDate}
                  onChange={(v) => set("returnDate", v)}
                  placeholder="Select return date"
                />
              </Field>

              <Field label="Pick-up point">
                <Input
                  value={form.pickup}
                  onChange={(e) => set("pickup", e.target.value)}
                  placeholder="Delhi / Chandigarh"
                  list="booking-pickup-suggestions"
                />
                <datalist id="booking-pickup-suggestions">
                  {pickupLocations.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </Field>
              <Field label="Drop-off point">
                <Input
                  value={form.dropoff}
                  onChange={(e) => set("dropoff", e.target.value)}
                  placeholder="Same as pickup"
                />
              </Field>

              <Field label="Adults">
                <Input
                  type="number"
                  min={1}
                  value={form.adults}
                  onChange={(e) => set("adults", Number(e.target.value))}
                />
              </Field>
              <Field label="Kids">
                <Input
                  type="number"
                  min={0}
                  value={form.kids}
                  onChange={(e) => set("kids", Number(e.target.value))}
                />
              </Field>

              <Field label="Select a cab">
                <Select value={form.cabType} onValueChange={(v) => set("cabType", v)}>
                  <SelectTrigger><SelectValue placeholder="--- Select Cab ---" /></SelectTrigger>
                  <SelectContent>
                    {cabFleet.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Days">
                <Input
                  type="number"
                  min={1}
                  value={form.days}
                  onChange={(e) => set("days", Number(e.target.value))}
                />
              </Field>

              <Field label="Tour plan in brief" className="sm:col-span-2">
                <Textarea
                  value={form.tourPlan}
                  onChange={(e) => set("tourPlan", e.target.value)}
                  placeholder="Share preferred hotels, sightseeing, budget notes…"
                  rows={3}
                />
              </Field>

              <Field label="Source">
                <Select value={form.source} onValueChange={(v) => set("source", v as Lead["source"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Assigned agent">
                <Select value={form.agent} onValueChange={(v) => set("agent", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {agentsList.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-slate uppercase">Driver & payment</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <Input
                  type="number"
                  min={0}
                  value={form.total}
                  onChange={(e) => set("total", Number(e.target.value))}
                />
                {rate ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ₹{rate.toLocaleString("en-IN")}/day × {form.days} day{form.days === 1 ? "" : "s"}
                  </p>
                ) : null}
              </Field>
              <Field label="Advance received (₹)">
                <Input
                  type="number"
                  min={0}
                  value={form.advance}
                  onChange={(e) => set("advance", Number(e.target.value))}
                />
              </Field>

              <Field label="Balance (₹)">
                <Input type="number" value={form.balance} readOnly className="bg-secondary/40" />
              </Field>
              <Field label="Payment status">
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
          </section>

          <Separator />

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
            <div className="grid grid-cols-1 gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-2">
              <Field label="Hotel name">
                <Input
                  value={hotel.hotelName}
                  onChange={(e) => setHotelField("hotelName", e.target.value)}
                  placeholder="Hotel Willow Banks"
                />
              </Field>
              <Field label="Reference / booking no.">
                <Input
                  value={hotel.referenceNumber}
                  onChange={(e) => setHotelField("referenceNumber", e.target.value)}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input
                  value={hotel.address}
                  onChange={(e) => setHotelField("address", e.target.value)}
                  placeholder="The Mall, Shimla, HP"
                />
              </Field>
              <Field label="Check-in">
                <DatePicker
                  value={hotel.checkIn}
                  onChange={(v) => setHotelField("checkIn", v)}
                  placeholder="Select check-in"
                />
              </Field>
              <Field label="Check-out">
                <DatePicker
                  value={hotel.checkOut}
                  onChange={(v) => setHotelField("checkOut", v)}
                  placeholder="Select check-out"
                />
              </Field>
              <Field label="Room type">
                <Input
                  value={hotel.roomType}
                  onChange={(e) => setHotelField("roomType", e.target.value)}
                  placeholder="Deluxe Mountain View"
                />
              </Field>
              <Field label="Room count">
                <Input
                  type="number"
                  min={1}
                  value={hotel.roomCount}
                  onChange={(e) => setHotelField("roomCount", Number(e.target.value))}
                />
              </Field>
              <Field label="Hotel amount (₹)">
                <Input
                  type="number"
                  min={0}
                  value={hotel.amount}
                  onChange={(e) => setHotelField("amount", Number(e.target.value))}
                />
              </Field>
              <Field label="Hotel contact number">
                <Input
                  value={hotel.contactNumber}
                  onChange={(e) => setHotelField("contactNumber", e.target.value)}
                />
              </Field>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="marigold" onClick={submit}>
            {booking ? "Save changes" : "Create booking"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
