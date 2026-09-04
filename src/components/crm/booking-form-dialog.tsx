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
  HotelTemplateFormDialog,
  type HotelTemplateFormState,
} from "@/components/crm/hotel-template-form-dialog";
import {
  Booking,
  BookingDriverAssignment,
  BookingStatus,
  Driver,
  Hotel,
  HotelTemplate,
  Lead,
  MarketingChannel,
  tourPackages,
  pickupLocations,
  cabFleet,
  estimateCabPrice,
  cloneStayFromHotelTemplate,
} from "@/lib/data";
import { assignmentWithVehicleNumber, bookingDrivers, bookingFromLead, bookingHotels, BOOKING_PAYMENT_MODES } from "@/lib/booking-utils";
import { formatDriverFleetLabel } from "@/lib/driver-utils";
import { useDriverAvailability } from "@/lib/use-driver-availability";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";

const ADD_HOTEL_VALUE = "__add_new_hotel__";

const sources: MarketingChannel[] = ["Website", "Google Ads", "Meta Ads", "Manual"];
const statuses: BookingStatus[] = [
  "Advance Pending",
  "Advance Received",
  "Balance Pending",
  "Fully Paid",
  "Cancelled",
  "Refunded",
];

export type BookingFormState = Omit<Booking, "id" | "bookingNo">;

type EmptyableNumber = number | "";

type BookingDrawerHotel = Omit<Hotel, "roomCount" | "amount"> & {
  roomCount: EmptyableNumber;
  amount: EmptyableNumber;
};

type BookingDrawerForm = Omit<
  BookingFormState,
  "adults" | "kids" | "days" | "total" | "advance" | "balance" | "hotels"
> & {
  adults: EmptyableNumber;
  kids: EmptyableNumber;
  days: EmptyableNumber;
  total: EmptyableNumber;
  advance: EmptyableNumber;
  balance: EmptyableNumber;
  hotels: BookingDrawerHotel[];
};

function numOrZero(value: EmptyableNumber): number {
  return value === "" ? 0 : Number(value) || 0;
}

function toSubmitPayload(form: BookingDrawerForm): BookingFormState {
  return {
    ...form,
    adults: numOrZero(form.adults),
    kids: numOrZero(form.kids),
    days: numOrZero(form.days) || 1,
    total: numOrZero(form.total),
    advance: numOrZero(form.advance),
    balance: numOrZero(form.balance),
    hotels: form.hotels.map((h) => ({
      ...h,
      roomCount: numOrZero(h.roomCount) || 1,
      amount: numOrZero(h.amount),
    })),
  };
}

const emptyHotel: BookingDrawerHotel = {
  hotelName: "",
  address: "",
  checkIn: "",
  checkOut: "",
  roomType: "",
  roomCount: "",
  amount: "",
  referenceNumber: "",
  contactNumber: "",
  notes: "",
};

function emptyForm(): BookingDrawerForm {
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
    cabType: "Ertiga (6+1)",
    adults: "",
    kids: "",
    days: "",
    tourPlan: "",
    agent: "Aman",
    driver: "",
    vehicle: "",
    drivers: [],
    total: "",
    advance: "",
    balance: "",
    status: "Advance Pending",
    paymentMode: "",
    hotels: [],
  };
}

function toFormState(booking: Booking): BookingDrawerForm {
  const { id: _id, bookingNo: _no, ...rest } = booking;
  return {
    ...rest,
    hotels: bookingHotels(booking),
  };
}

function fromLeadForm(lead: Lead): BookingDrawerForm {
  const base = bookingFromLead(lead);
  const { bookingNo: _no, ...rest } = base;
  return {
    ...rest,
    hotels: [],
    // Don't prefill money fields with 0 — show placeholders until the user enters values.
    advance: "",
    balance: "",
  };
}

function HotelStayFields({
  hotel,
  setHotelField,
  applyTemplate,
  templates,
  onAddNew,
  title,
  onRemove,
}: {
  hotel: BookingDrawerHotel;
  setHotelField: <K extends keyof BookingDrawerHotel>(key: K, value: BookingDrawerHotel[K]) => void;
  applyTemplate: (templateId: string) => void;
  templates: HotelTemplate[];
  onAddNew: () => void;
  title?: string;
  onRemove?: () => void;
}) {
  const usable = templates.filter((t) => t.status === "Active" || t.status === "Draft");

  return (
    <div className="grid grid-cols-1 gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-2">
      {(title || onRemove) && (
        <div className="flex items-center justify-between sm:col-span-2">
          <p className="text-xs font-medium text-ink-text">{title}</p>
          {onRemove ? (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-signal" onClick={onRemove}>
              <Trash2 className="size-3.5" /> Remove
            </Button>
          ) : null}
        </div>
      )}
      <Field label="Hotel name" className="sm:col-span-2">
        <div className="flex gap-2">
          <Select
            value={hotel.hotelTemplateId || undefined}
            onValueChange={(v) => {
              if (v === ADD_HOTEL_VALUE) {
                onAddNew();
                return;
              }
              applyTemplate(v);
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select hotel from masters" />
            </SelectTrigger>
            <SelectContent>
              {usable.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} · {t.city}
                </SelectItem>
              ))}
              <SelectItem value={ADD_HOTEL_VALUE}>+ Add new hotel…</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="Add new hotel"
            onClick={onAddNew}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        {!hotel.hotelTemplateId && hotel.hotelName ? (
          <p className="mt-1 text-[11px] text-slate-soft">Custom / unlinked stay: {hotel.hotelName}</p>
        ) : null}
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
          type="text"
          inputMode="numeric"
          placeholder="e.g. 1"
          value={hotel.roomCount === "" ? "" : hotel.roomCount}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            setHotelField("roomCount", raw === "" ? "" : Number(raw));
          }}
        />
      </Field>
      <Field label="Hotel amount (₹)">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="e.g. 5000"
          value={hotel.amount === "" ? "" : hotel.amount}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            setHotelField("amount", raw === "" ? "" : Number(raw));
          }}
        />
      </Field>
      <Field label="Hotel contact number">
        <Input
          value={hotel.contactNumber ?? ""}
          onChange={(e) => setHotelField("contactNumber", e.target.value)}
        />
      </Field>
      <Field label="Ops notes" className="sm:col-span-2">
        <Textarea
          rows={2}
          value={hotel.notes ?? ""}
          onChange={(e) => setHotelField("notes", e.target.value)}
          placeholder="Confirmation call notes, meal plan…"
        />
      </Field>
    </div>
  );
}

function DriverAssignmentsFields({
  assignments,
  drivers,
  occupiedDriverNames,
  onChange,
}: {
  assignments: BookingDriverAssignment[];
  drivers: Driver[];
  occupiedDriverNames: Set<string>;
  onChange: (next: BookingDriverAssignment[]) => void;
}) {
  const row = assignments[0] ?? { driver: "", vehicle: "" };

  function pickDriver(name: string) {
    if (occupiedDriverNames.has(name)) return;
    const d = drivers.find((item) => item.name === name);
    onChange([{ driver: name, vehicle: d?.vehicle ?? "" }]);
  }

  return (
    <>
      <Field label="Driver">
        <Select value={row.driver || undefined} onValueChange={pickDriver}>
          <SelectTrigger>
            <SelectValue placeholder="Select driver" />
          </SelectTrigger>
          <SelectContent>
            {drivers.map((d) => {
              const unavailable = occupiedDriverNames.has(d.name);
              return (
                <SelectItem key={d.id} value={d.name} disabled={unavailable}>
                  {formatDriverFleetLabel(d)}
                  {unavailable ? " · Not available" : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Vehicle" hint="Auto-filled with vehicle number from driver, editable">
        <Input
          value={row.vehicle}
          onChange={(e) => onChange([{ driver: row.driver, vehicle: e.target.value }])}
        />
      </Field>
    </>
  );
}

export function BookingFormDialog({
  trigger,
  booking,
  lead,
  drivers,
  onSubmit,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  booking?: Booking;
  lead?: Lead;
  drivers: Driver[];
  onSubmit: (data: BookingFormState) => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { state, addHotelTemplate } = useData();
  const { toast } = useToast();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [form, setForm] = React.useState<BookingDrawerForm>(
    booking ? toFormState(booking) : lead ? fromLeadForm(lead) : emptyForm()
  );
  const [hotelEnabled, setHotelEnabled] = React.useState(
    () => (booking ? bookingHotels(booking).length > 0 : false)
  );
  const [stays, setStays] = React.useState<BookingDrawerHotel[]>(() => {
    if (!booking) return [];
    const hotels = bookingHotels(booking);
    return hotels.length ? hotels : [];
  });
  const [assignments, setAssignments] = React.useState<BookingDriverAssignment[]>(() => {
    if (!booking) return [{ driver: "", vehicle: "" }];
    const list = bookingDrivers(booking);
    return list.length
      ? [assignmentWithVehicleNumber(list[0], drivers)]
      : [{ driver: "", vehicle: "" }];
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [addHotelOpen, setAddHotelOpen] = React.useState(false);
  const [addHotelForIndex, setAddHotelForIndex] = React.useState<number | null>(null);

  const converting = !!lead && !booking;
  const hotelTemplates = state.hotelTemplates;

  const { occupiedSet: occupiedDriverNames } = useDriverAvailability({
    enabled: open,
    travel_date: form.travelDate,
    return_date: form.returnDate,
    exclude_booking_id: booking?.id,
  });

  React.useEffect(() => {
    if (!open) return;
    setAssignments((current) => {
      const selected = current[0]?.driver?.trim();
      if (!selected || !occupiedDriverNames.has(selected)) return current;
      return [{ driver: "", vehicle: "" }];
    });
  }, [open, occupiedDriverNames, form.travelDate, form.returnDate]);

  React.useEffect(() => {
    if (!open) return;
    if (booking) {
      setForm(toFormState(booking));
      const hotels = bookingHotels(booking);
      setStays(hotels.length ? hotels : []);
      setHotelEnabled(hotels.length > 0);
      const list = bookingDrivers(booking);
      setAssignments(
        list.length
          ? [assignmentWithVehicleNumber(list[0], drivers)]
          : [{ driver: "", vehicle: "" }]
      );
    } else if (lead) {
      setForm(fromLeadForm(lead));
      setHotelEnabled(false);
      setStays([]);
      setAssignments([{ driver: "", vehicle: "" }]);
    } else {
      setForm(emptyForm());
      setHotelEnabled(false);
      setStays([]);
      setAssignments([{ driver: "", vehicle: "" }]);
    }
    setError("");
    setAddHotelOpen(false);
    setAddHotelForIndex(null);
  }, [open, booking, lead, drivers]);

  function set<K extends keyof BookingDrawerForm>(key: K, value: BookingDrawerForm[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "cabType" || key === "days") {
        const cabType = key === "cabType" ? (value as string) : next.cabType;
        const days = numOrZero(key === "days" ? (value as EmptyableNumber) : next.days);
        if (days > 0) {
          next.total = estimateCabPrice(cabType, days);
          next.balance = Math.max(numOrZero(next.total) - numOrZero(next.advance), 0);
        }
      }
      if (key === "total" || key === "advance") {
        const total = numOrZero(key === "total" ? (value as EmptyableNumber) : next.total);
        const advance = numOrZero(key === "advance" ? (value as EmptyableNumber) : next.advance);
        next.balance = Math.max(total - advance, 0);
      }
      return next;
    });
  }

  function setStayField<K extends keyof BookingDrawerHotel>(
    index: number,
    key: K,
    value: BookingDrawerHotel[K]
  ) {
    setStays((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  function applyHotelTemplate(index: number, templateId: string, templates = hotelTemplates) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const cloned = cloneStayFromHotelTemplate(template, {
      travelDate: form.travelDate,
      returnDate: form.returnDate,
    });
    setStays((rows) =>
      rows.map((prev, i) =>
        i === index
          ? {
              ...cloned,
              checkIn: prev.checkIn || cloned.checkIn,
              checkOut: prev.checkOut || cloned.checkOut,
              referenceNumber: prev.referenceNumber,
              notes: prev.notes,
              roomCount: prev.roomCount || 1,
            }
          : prev
      )
    );
  }

  function toggleHotels(enabled: boolean) {
    setHotelEnabled(enabled);
    if (enabled) {
      setStays((rows) => (rows.length ? rows : [{ ...emptyHotel }]));
    } else {
      setStays([]);
    }
  }

  async function handleCreateHotelTemplate(data: HotelTemplateFormState) {
    const created = await addHotelTemplate({ ...data, status: data.status || "Active" });
    const index = addHotelForIndex ?? 0;
    const cloned = cloneStayFromHotelTemplate(created, {
      travelDate: form.travelDate,
      returnDate: form.returnDate,
    });
    setHotelEnabled(true);
    setStays((rows) => {
      const next = rows.length ? [...rows] : [{ ...emptyHotel }];
      while (next.length <= index) next.push({ ...emptyHotel });
      const prev = next[index];
      next[index] = {
        ...cloned,
        checkIn: prev.checkIn || cloned.checkIn,
        checkOut: prev.checkOut || cloned.checkOut,
        referenceNumber: prev.referenceNumber,
        notes: prev.notes,
        roomCount: prev.roomCount || 1,
      };
      return next;
    });
    setAddHotelOpen(false);
    setAddHotelForIndex(null);
    toast({
      variant: "success",
      title: "Hotel added",
      description: `${created.name} saved to masters and applied to this stay.`,
    });
  }

  async function submit() {
    if (!form.customer.trim() || !form.phone?.trim()) {
      setError("Name and phone are required");
      return;
    }
    if (converting && numOrZero(form.total) <= 0) {
      setError("Total amount must be greater than 0");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const hotels = hotelEnabled
        ? stays.filter((h) => h.hotelName.trim()).map((h) => ({
            ...h,
            roomCount: numOrZero(h.roomCount) || 1,
            amount: numOrZero(h.amount),
          }))
        : [];
      const driversList = assignments.filter((d) => d.driver.trim()).slice(0, 1);
      const payload = toSubmitPayload({
        ...form,
        hotels,
      });
      await onSubmit({
        ...payload,
        leadId: lead?.id ?? form.leadId ?? null,
        balance: Math.max(payload.total - payload.advance, 0),
        hotels,
        hotel: hotels[0],
        drivers: driversList,
        driver: driversList[0]?.driver ?? "",
        vehicle: driversList[0]?.vehicle ?? "",
        comments: booking?.comments ?? form.comments,
        history: booking?.history ?? form.history,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save booking");
    } finally {
      setSaving(false);
    }
  }

  const rate = cabFleet.find((c) => c.name === form.cabType)?.ratePerDay;

  const hotelsSection = (
    <>
      <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <BedDouble className="size-4 text-marigold-ink" />
          <div>
            <p className="text-xs font-medium text-ink-text">Assign hotels (optional)</p>
            <p className="text-[11px] text-slate-soft">Add one or more stays from masters</p>
          </div>
        </div>
        <Switch checked={hotelEnabled} onCheckedChange={toggleHotels} />
      </div>

      {hotelEnabled && (
        <div className="space-y-3">
          {stays.map((stay, index) => (
            <HotelStayFields
              key={`stay-${index}`}
              title={stays.length > 1 ? `Hotel ${index + 1}` : undefined}
              hotel={stay}
              setHotelField={(key, value) => setStayField(index, key, value)}
              applyTemplate={(templateId) => applyHotelTemplate(index, templateId)}
              templates={hotelTemplates}
              onAddNew={() => {
                setAddHotelForIndex(index);
                setAddHotelOpen(true);
              }}
              onRemove={
                stays.length > 1
                  ? () => setStays((rows) => rows.filter((_, i) => i !== index))
                  : undefined
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setStays((rows) => [...rows, { ...emptyHotel }])}
          >
            <Plus className="size-3.5" /> Add another hotel
          </Button>
        </div>
      )}
    </>
  );

  const sheet = (
    <SheetContent
      className="sm:max-w-lg"
      onFocusOutside={(e) => e.preventDefault()}
      onClose={() => !saving && setOpen(false)}
    >
      <SheetHeader>
        <SheetTitle>
          {booking
            ? "Edit booking"
            : converting
              ? "Create booking from lead"
              : "New booking"}
        </SheetTitle>
        <SheetDescription>
          {booking
            ? `Updating ${booking.bookingNo ?? booking.id}`
            : converting
              ? `Mark ${lead?.leadNo ?? "lead"} as Booked · add driver, payment & hotel`
              : "Same enquiry fields as leads, plus driver, payment and hotel"}
        </SheetDescription>
      </SheetHeader>

      <form
        className="flex min-h-0 flex-1 flex-col"
        autoComplete="on"
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving) void submit();
        }}
      >
      <SheetBody className="space-y-5">        {converting && lead ? (
          <>
            <section className="space-y-2 rounded-md border border-border-soft bg-secondary/40 p-3">
              <p className="text-xs font-semibold tracking-wide text-slate uppercase">
                From lead {lead.leadNo}
              </p>
              <p className="text-sm font-medium text-ink-text">{lead.name}</p>
              <p className="text-xs text-slate">
                {lead.phone}
                {lead.email ? ` · ${lead.email}` : ""}
              </p>
              <p className="text-xs text-slate">
                {lead.tourPackage || "Custom"}
                {lead.pickup ? ` · ${lead.pickup}` : ""}
                {lead.drop ? ` → ${lead.drop}` : ""}
              </p>
              <p className="text-xs text-slate-soft">
                {lead.pickupDate || "—"}
                {lead.dropDate ? ` → ${lead.dropDate}` : ""}
                {lead.car ? ` · ${lead.car}` : ""}
                {` · ${lead.adults}A`}
                {lead.kids > 0 ? `+${lead.kids}K` : ""}
                {` · ${lead.days}d`}
                {lead.price > 0 ? ` · ₹${lead.price.toLocaleString("en-IN")}` : ""}
              </p>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-slate uppercase">
                Booking details (not on lead)
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DriverAssignmentsFields
                  assignments={assignments}
                  drivers={drivers}
                  occupiedDriverNames={occupiedDriverNames}
                  onChange={setAssignments}
                />

                <Field label="Total amount (₹)">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 15000"
                    value={form.total === "" ? "" : form.total}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      set("total", raw === "" ? "" : Number(raw));
                    }}
                  />
                  {rate && Number(form.days) > 0 ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      ₹{rate.toLocaleString("en-IN")}/day × {form.days} day
                      {form.days === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </Field>
                <Field label="Advance received (₹)">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 5000"
                    value={form.advance === "" ? "" : form.advance}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      set("advance", raw === "" ? "" : Number(raw));
                    }}
                  />
                </Field>

                <Field label="Balance (₹)">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="—"
                    value={form.balance === "" ? "" : form.balance}
                    readOnly
                    className="bg-secondary/40"
                  />
                </Field>
                <Field label="Payment mode">
                  <Select
                    value={form.paymentMode || "__none__"}
                    onValueChange={(v) => set("paymentMode", v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not set</SelectItem>
                      {BOOKING_PAYMENT_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Payment status">
                  <Select
                    value={form.status}
                    onValueChange={(v) => set("status", v as BookingStatus)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
            </section>

            <Separator />

            {hotelsSection}
          </>
        ) : (
          <>
        <section className="space-y-3">
          {/* <p className="text-xs font-semibold tracking-wide text-slate uppercase">About yourself</p> */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={form.customer}
                onChange={(e) => set("customer", e.target.value)}
                placeholder="Ritika Sharma"
                name="booking_customer_name"
                autoComplete="name"
              />
            </Field>
            <Field label="Email ID">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="ritika@email.com"
                name="booking_customer_email"
                autoComplete="email"
              />
            </Field>
            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Delhi"
                name="booking_customer_city"
                autoComplete="address-level2"
              />
            </Field>
            <Field label="Phone number">
              <Input
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 98170 22314"
                name="booking_customer_phone"
                autoComplete="tel"
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
                type="text"
                inputMode="numeric"
                placeholder="e.g. 2"
                value={form.adults === "" ? "" : form.adults}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  set("adults", raw === "" ? "" : Number(raw));
                }}
              />
            </Field>
            <Field label="Kids">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 0"
                value={form.kids === "" ? "" : form.kids}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  set("kids", raw === "" ? "" : Number(raw));
                }}
              />
            </Field>

            <Field label="Days">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 5"
                value={form.days === "" ? "" : form.days}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  set("days", raw === "" ? "" : Number(raw));
                }}
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
              <Select value={form.source} onValueChange={(v) => set("source", v as MarketingChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-slate uppercase">
            Driver & payment
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DriverAssignmentsFields
              assignments={assignments}
              drivers={drivers}
              occupiedDriverNames={occupiedDriverNames}
              onChange={setAssignments}
            />

            <Field label="Total amount (₹)">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 15000"
                value={form.total === "" ? "" : form.total}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  set("total", raw === "" ? "" : Number(raw));
                }}
              />
              {rate && Number(form.days) > 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ₹{rate.toLocaleString("en-IN")}/day × {form.days} day{form.days === 1 ? "" : "s"}
                </p>
              ) : null}
            </Field>
            <Field label="Advance received (₹)">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 5000"
                value={form.advance === "" ? "" : form.advance}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  set("advance", raw === "" ? "" : Number(raw));
                }}
              />
            </Field>

            <Field label="Balance (₹)">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="—"
                value={form.balance === "" ? "" : form.balance}
                readOnly
                className="bg-secondary/40"
              />
            </Field>
            <Field label="Payment mode">
              <Select
                value={form.paymentMode || "__none__"}
                onValueChange={(v) => set("paymentMode", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {BOOKING_PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {hotelsSection}
          </>
        )}

        {error ? <p className="text-sm text-signal">{error}</p> : null}
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="marigold" disabled={saving}>
          {saving
            ? "Saving…"
            : booking
              ? "Save changes"
              : converting
                ? "Create booking & mark Booked"
                : "Create booking"}
        </Button>
      </SheetFooter>
      </form>
    </SheetContent>
  );

  const addHotelDialog = (
    <HotelTemplateFormDialog
      open={addHotelOpen}
      onOpenChange={setAddHotelOpen}
      onSubmit={async (data) => {
        try {
          await handleCreateHotelTemplate({ ...data, status: "Active" });
        } catch (err) {
          toast({
            variant: "error",
            title: "Could not add hotel",
            description: err instanceof Error ? err.message : "Please try again.",
          });
          throw err;
        }
      }}
    />
  );

  if (trigger) {
    return (
      <>
        <Sheet open={open} onOpenChange={(next) => !saving && setOpen(next)}>
          <SheetTrigger asChild>{trigger}</SheetTrigger>
          {sheet}
        </Sheet>
        {addHotelDialog}
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        {sheet}
      </Sheet>
      {addHotelDialog}
    </>
  );
}
