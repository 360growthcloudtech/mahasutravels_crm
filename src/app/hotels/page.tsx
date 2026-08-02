"use client";

import * as React from "react";
import { BedDouble, MapPin, Phone, Pencil, X, Hotel as HotelIcon } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingFormDialog } from "@/components/crm/booking-form-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { bookingRoute } from "@/lib/data";
import { formatDisplayDate } from "@/components/crm/date-picker";

export default function HotelsPage() {
  const { state, updateBooking, removeHotel } = useData();
  const { toast } = useToast();

  const withHotel = state.bookings.filter((b) => b.hotel);
  const eligibleNoHotel = state.bookings.filter(
    (b) => !b.hotel && b.status !== "Cancelled" && b.status !== "Refunded"
  );
  const totalHotelSpend = withHotel.reduce((s, b) => s + (b.hotel?.amount ?? 0), 0);

  return (
    <Shell>
      <Topbar eyebrow="Module 12 · Hotel details (manual entry)" title="Hotels" />

      <main className="px-6 py-6 lg:px-8">
        <Card className="mb-4 border-dashed">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-marigold-soft text-marigold-ink">
              <HotelIcon className="size-4.5" />
            </div>
            <p className="text-xs text-muted-foreground">
              There&apos;s no hotel inventory or live availability here by design. The hotel section only
              unlocks once a booking is confirmed — your ops team calls the hotel directly, then logs the
              stay against that booking. Hotel assignment is always optional.
            </p>
          </CardContent>
        </Card>

        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Bookings with hotel</p>
              <p className="mt-1 font-display text-xl font-semibold">{withHotel.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total hotel spend</p>
              <p className="mt-1 font-display text-xl font-semibold text-teal">
                ₹{totalHotelSpend.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Eligible, not yet assigned</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">{eligibleNoHotel.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-3 font-display text-sm font-semibold text-ink-text">Assigned stays</p>
            <div className="space-y-3">
              {withHotel.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink-text">{b.hotel!.hotelName}</p>
                        <p className="text-xs text-muted-foreground">
                          For {b.customer} · <span className="font-mono-data">{b.id}</span>
                        </p>
                      </div>
                      <Badge variant="marigold">₹{b.hotel!.amount.toLocaleString("en-IN")}</Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 shrink-0 text-slate-soft" /> {b.hotel!.address}
                      </div>
                      <div className="flex items-center gap-2">
                        <BedDouble className="size-3.5 shrink-0 text-slate-soft" />
                        {b.hotel!.roomType} · {b.hotel!.roomCount} room(s) ·{" "}
                        <span className="font-mono-data">{b.hotel!.checkIn} → {b.hotel!.checkOut}</span>
                      </div>
                      {b.hotel!.contactNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="size-3.5 shrink-0 text-slate-soft" />
                          <span className="font-mono-data">{b.hotel!.contactNumber}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <BookingFormDialog
                        booking={b}
                        drivers={state.drivers}
                        trigger={<Button size="sm" variant="outline"><Pencil className="size-3.5" /> Edit</Button>}
                        onSubmit={(data) => {
                          updateBooking(b.id, data);
                          toast({ variant: "success", title: "Hotel updated", description: `Stay details saved for ${b.id}.` });
                        }}
                      />
                      <Button size="sm" variant="outline" onClick={() => {
                        removeHotel(b.id);
                        toast({ variant: "info", title: "Hotel removed", description: `Hotel detached from ${b.id}.` });
                      }}>
                        <X className="size-3.5" /> Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {withHotel.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No hotels assigned yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div>
            <p className="mb-3 font-display text-sm font-semibold text-ink-text">Bookings without a hotel</p>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick assign</CardTitle>
                <CardDescription>Confirmed or in-progress bookings that could use one</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {eligibleNoHotel.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-md border border-border-soft p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-text">{b.customer}</p>
                      <p className="text-xs text-muted-foreground">{bookingRoute(b)} · {formatDisplayDate(b.travelDate)}</p>
                    </div>
                    <BookingFormDialog
                      booking={b}
                      drivers={state.drivers}
                      trigger={
                        <Button size="sm" variant="secondary">
                          <BedDouble className="size-3.5" /> Assign
                        </Button>
                      }
                      onSubmit={(data) => {
                        updateBooking(b.id, data);
                        toast({ variant: "success", title: "Hotel assigned", description: `Stay details added to ${b.id}.` });
                      }}
                    />
                  </div>
                ))}
                {eligibleNoHotel.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">All eligible bookings have hotels assigned.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </Shell>
  );
}
