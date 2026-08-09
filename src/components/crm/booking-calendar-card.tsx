"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/crm/status-badge";
import { toStoredDate } from "@/components/crm/date-picker";
import { Booking, bookingRoute } from "@/lib/data";
import { cn } from "@/lib/utils";

function isLiveBooking(b: Booking) {
  return b.status !== "Cancelled" && b.status !== "Refunded";
}

function bookingsOnDay(bookings: Booking[], iso: string) {
  return bookings.filter(
    (b) => isLiveBooking(b) && b.travelDate <= iso && b.returnDate >= iso
  );
}

function formatTripDate(iso: string) {
  return format(new Date(`${iso}T12:00:00`), "d MMM");
}

export function BookingCalendarCard({ bookings }: { bookings: Booking[] }) {
  const [month, setMonth] = React.useState(() => new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [open, setOpen] = React.useState(false);

  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) {
      if (!isLiveBooking(b)) continue;
      const start = new Date(`${b.travelDate}T12:00:00`);
      const end = new Date(`${b.returnDate}T12:00:00`);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toStoredDate(d);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return map;
  }, [bookings]);

  const selectedIso = selectedDay ? toStoredDate(selectedDay) : null;
  const dayBookings = selectedIso
    ? bookingsOnDay(bookings, selectedIso).sort(
        (a, b) => a.travelDate.localeCompare(b.travelDate) || a.id.localeCompare(b.id)
      )
    : [];

  function onSelectDay(day: Date | undefined) {
    if (!day) return;
    setSelectedDay(day);
    setOpen(true);
  }

  return (
    <>
      <Card className="xl:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4 text-slate-soft" />
                Booking calendar
              </CardTitle>
              <CardDescription>
                Counts show active trips that day — click a date for details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center pt-0">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selectedDay ?? undefined}
            onSelect={onSelectDay}
            captionLayout="label"
            weekStartsOn={1}
            className="w-full p-0"
            classNames={{
              month: "w-full space-y-3",
              month_grid: "w-full border-collapse",
              weekdays: "flex w-full",
              weekday: "flex-1 text-center text-[0.7rem] font-medium text-muted-foreground",
              week: "mt-1 flex w-full",
              day: "relative flex-1 p-0.5 text-center text-sm",
              day_button:
                "flex h-14 w-full flex-col items-center justify-start gap-0.5 rounded-md px-0.5 py-1 text-sm font-normal hover:bg-secondary",
              selected:
                "[&>button]:bg-ink [&>button]:text-white [&>button]:hover:bg-ink-soft [&>button]:hover:text-white",
              today: "[&>button]:bg-marigold-soft [&>button]:text-marigold-ink",
              outside: "[&>button]:text-muted-foreground [&>button]:opacity-40",
            }}
            components={{
              DayButton: ({ day, modifiers, ...buttonProps }) => {
                const iso = toStoredDate(day.date);
                const count = counts.get(iso) ?? 0;
                const isOutside = modifiers.outside;
                return (
                  <button
                    type="button"
                    {...buttonProps}
                    className={cn(buttonProps.className)}
                  >
                    <span className="leading-none">{format(day.date, "d")}</span>
                    {count > 0 && !isOutside ? (
                      <span
                        className={cn(
                          "font-mono-data rounded-full px-1.5 text-[10px] font-semibold leading-4",
                          modifiers.selected
                            ? "bg-white/20 text-white"
                            : "bg-teal-soft text-teal"
                        )}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="h-4" />
                    )}
                  </button>
                );
              },
            }}
          />
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-slate-soft" />
              {selectedDay ? format(selectedDay, "EEEE, d MMM yyyy") : "Day bookings"}
            </SheetTitle>
            <SheetDescription>
              {dayBookings.length === 0
                ? "No active bookings on this day"
                : `${dayBookings.length} booking${dayBookings.length === 1 ? "" : "s"} active`}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-2 p-0">
            {dayBookings.length === 0 ? (
              <div className="mx-5 rounded-md border border-dashed border-border px-4 py-10 text-center">
                <CalendarDays className="mx-auto size-5 text-slate-soft" />
                <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled</p>
                <p className="mt-0.5 text-xs text-slate-soft">
                  Pick another date or create a booking.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border-soft">
                {dayBookings.map((b) => (
                  <li key={b.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-text">{b.customer}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {bookingRoute(b)}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono-data text-[11px] text-slate-soft">
                        {b.id}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono-data text-[11px] text-slate">
                        {formatTripDate(b.travelDate)}
                        {b.returnDate !== b.travelDate
                          ? ` – ${formatTripDate(b.returnDate)}`
                          : ""}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-soft">
                      {b.driver ? <span>Driver · {b.driver}</span> : null}
                      {b.vehicle ? <span>{b.vehicle}</span> : null}
                      <span>₹{b.total.toLocaleString("en-IN")}</span>
                      {b.agent ? <span>{b.agent}</span> : null}
                    </div>
                    {b.tourPackage ? (
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {b.tourPackage}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SheetBody>

          <SheetFooter>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/bookings">Open bookings</Link>
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
