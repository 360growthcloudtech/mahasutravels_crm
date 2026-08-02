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
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Field } from "@/components/crm/field";
import { DatePicker, formatDisplayDate } from "@/components/crm/date-picker";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Booking,
  Hotel,
  HotelTemplate,
  bookingRoute,
  cloneStayFromHotelTemplate,
} from "@/lib/data";

const emptyHotel = (booking?: Booking | null): Hotel => ({
  hotelTemplateId: undefined,
  hotelName: "",
  address: "",
  checkIn: booking?.travelDate || "",
  checkOut: booking?.returnDate || "",
  roomType: "",
  roomCount: 1,
  amount: 0,
  referenceNumber: "",
  contactNumber: "",
  notes: "",
});

export function HotelAssignDrawer({
  booking,
  templates,
  open,
  onOpenChange,
  onSave,
}: {
  booking: Booking | null;
  templates: HotelTemplate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (hotel: Hotel) => void;
}) {
  const [hotel, setHotel] = React.useState<Hotel>(emptyHotel());
  const [error, setError] = React.useState("");
  const editing = Boolean(booking?.hotel);

  const usableTemplates = templates.filter((t) => t.status === "Active" || t.status === "Draft");

  React.useEffect(() => {
    if (!open || !booking) return;
    setHotel(
      booking.hotel
        ? {
            ...booking.hotel,
            contactNumber: booking.hotel.contactNumber ?? "",
            notes: booking.hotel.notes ?? "",
          }
        : emptyHotel(booking)
    );
    setError("");
  }, [open, booking]);

  function setField<K extends keyof Hotel>(key: K, value: Hotel[K]) {
    setHotel((h) => ({ ...h, [key]: value }));
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template || !booking) return;
    const cloned = cloneStayFromHotelTemplate(template, booking);
    setHotel((prev) => ({
      ...cloned,
      checkIn: prev.checkIn || cloned.checkIn,
      checkOut: prev.checkOut || cloned.checkOut,
      roomCount: prev.roomCount || 1,
      referenceNumber: prev.referenceNumber,
      notes: prev.notes,
    }));
  }

  function submit() {
    if (!hotel.hotelName.trim()) {
      setError("Hotel name is required. Pick a master template or type a name.");
      return;
    }
    if (!hotel.checkIn || !hotel.checkOut) {
      setError("Check-in and check-out dates are required.");
      return;
    }
    if (hotel.roomCount < 1) {
      setError("Room count must be at least 1.");
      return;
    }
    onSave({
      ...hotel,
      hotelName: hotel.hotelName.trim(),
      address: hotel.address.trim(),
      roomType: hotel.roomType.trim(),
      referenceNumber: hotel.referenceNumber.trim(),
      contactNumber: hotel.contactNumber?.trim() || undefined,
      notes: hotel.notes?.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BedDouble className="size-4 text-marigold-ink" />
            {editing ? "Edit hotel stay" : "Log hotel stay"}
          </SheetTitle>
          {booking && (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-text">{booking.customer}</span>
                <StatusBadge status={booking.status} />
              </div>
              <SheetDescription>
                {booking.id} · {bookingRoute(booking)} · {formatDisplayDate(booking.travelDate)}
                {" → "}
                {formatDisplayDate(booking.returnDate)}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div className="rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2.5 text-[11px] text-slate">
            Pick a <span className="font-medium text-ink-text">master hotel template</span>, then
            adjust stay dates, rooms and reference. Edits here only affect this booking — the master
            stays unchanged. No live inventory.
          </div>

          <Field label="Master hotel template">
            <Select
              value={hotel.hotelTemplateId || ""}
              onValueChange={applyTemplate}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select hotel master" />
              </SelectTrigger>
              <SelectContent>
                {usableTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {t.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {hotel.hotelTemplateId ? (
            <Badge variant="secondary" className="font-normal">
              Using master {hotel.hotelTemplateId} · stay copy on booking
            </Badge>
          ) : (
            <Badge variant="outline" className="font-normal">
              Custom stay (no master linked)
            </Badge>
          )}

          <Field label="Hotel name">
            <Input
              value={hotel.hotelName}
              onChange={(e) => setField("hotelName", e.target.value)}
              placeholder="Hotel Willow Banks"
            />
          </Field>

          <Field label="Address / location">
            <Input
              value={hotel.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="The Mall, Shimla, HP"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in">
              <DatePicker
                value={hotel.checkIn}
                onChange={(v) => setField("checkIn", v)}
                placeholder="Select check-in"
              />
            </Field>
            <Field label="Check-out">
              <DatePicker
                value={hotel.checkOut}
                onChange={(v) => setField("checkOut", v)}
                placeholder="Select check-out"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Room type">
              <Input
                value={hotel.roomType}
                onChange={(e) => setField("roomType", e.target.value)}
                placeholder="Deluxe Mountain View"
              />
            </Field>
            <Field label="Rooms">
              <Input
                type="number"
                min={1}
                value={hotel.roomCount}
                onChange={(e) => setField("roomCount", Number(e.target.value) || 1)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stay amount (₹)">
              <Input
                type="number"
                min={0}
                value={hotel.amount}
                onChange={(e) => setField("amount", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Reference / booking no.">
              <Input
                value={hotel.referenceNumber}
                onChange={(e) => setField("referenceNumber", e.target.value)}
                placeholder="WB-RES-4471"
              />
            </Field>
          </div>

          <Field label="Hotel contact number">
            <Input
              value={hotel.contactNumber ?? ""}
              onChange={(e) => setField("contactNumber", e.target.value)}
              placeholder="+91 …"
            />
          </Field>

          <Field label="Stay notes" hint="Confirmation call notes for this booking only">
            <Textarea
              rows={3}
              value={hotel.notes ?? ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Confirmed on phone · MAP · early check-in requested"
            />
          </Field>

          {error ? <p className="text-xs text-signal">{error}</p> : null}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="marigold" onClick={submit}>
            {editing ? "Save stay details" : "Assign hotel stay"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
