"use client";

import * as React from "react";
import { MoreHorizontal, Plus, Pencil, Trash2, BedDouble, X } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BookingFormDialog } from "@/components/crm/booking-form-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Booking } from "@/lib/data";

export default function BookingsPage() {
  const { state, addBooking, updateBooking, deleteBooking, removeHotel } = useData();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = React.useState<Booking | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const totalRevenue = state.bookings
    .filter((b) => b.status !== "Cancelled" && b.status !== "Refunded")
    .reduce((s, b) => s + b.total, 0);
  const pendingBalance = state.bookings.reduce((s, b) => s + b.balance, 0);
  const withHotel = state.bookings.filter((b) => b.hotel).length;

  return (
    <Shell>
      <Topbar
        eyebrow="Module 9 & 12 · Bookings, payments & hotel add-on"
        title="Bookings"
        action={
          <BookingFormDialog
            trigger={
              <Button variant="marigold">
                <Plus className="size-4" /> New Booking
              </Button>
            }
            drivers={state.drivers}
            onSubmit={(data) => {
              addBooking(data);
              toast({ variant: "success", title: "Booking created", description: `${data.customer}'s trip is on the books.` });
            }}
          />
        }
      />

      <main className="px-6 py-6 lg:px-8">
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Active bookings</p>
              <p className="mt-1 font-display text-xl font-semibold">{state.bookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Confirmed revenue</p>
              <p className="mt-1 font-display text-xl font-semibold text-teal">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Balance pending</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">
                ₹{pendingBalance.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">With hotel add-on</p>
              <p className="mt-1 font-display text-xl font-semibold text-violet">{withHotel}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Travel date</TableHead>
                <TableHead>Driver / Vehicle</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Advance</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.bookings.map((b) => {
                const saveBooking = (data: Parameters<typeof updateBooking>[1]) => {
                  updateBooking(b.id, data);
                  toast({ variant: "success", title: "Booking updated", description: `${b.id} saved successfully.` });
                };
                const dropHotel = () => {
                  removeHotel(b.id);
                  toast({ variant: "info", title: "Hotel removed", description: `Hotel detached from ${b.id}.` });
                };
                return (
                <React.Fragment key={b.id}>
                  <TableRow className={expanded === b.id ? "bg-secondary/40" : ""}>
                    <TableCell>
                      <button
                        className="text-left"
                        onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                      >
                        <p className="flex items-center gap-1.5 text-sm font-medium text-ink-text">
                          {b.customer}
                          {b.hotel && <BedDouble className="size-3.5 text-marigold-ink" />}
                        </p>
                        <p className="font-mono-data text-[11px] text-slate-soft">{b.id}</p>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-ink-text">{b.route}</TableCell>
                    <TableCell className="text-sm text-slate">{b.travelDate}</TableCell>
                    <TableCell>
                      <p className="text-sm text-ink-text">{b.driver || "—"}</p>
                      <p className="font-mono-data text-[11px] text-slate-soft">{b.vehicle}</p>
                    </TableCell>
                    <TableCell className="text-right font-mono-data text-sm text-ink-text">
                      ₹{b.total.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right font-mono-data text-sm text-teal">
                      ₹{b.advance.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right font-mono-data text-sm text-signal">
                      {b.balance > 0 ? `₹${b.balance.toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <BookingFormDialog
                              booking={b}
                              drivers={state.drivers}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Pencil className="size-3.5" /> Edit booking
                                </DropdownMenuItem>
                              }
                              onSubmit={saveBooking}
                            />
                            <DropdownMenuItem onSelect={() => setExpanded(b.id)}>
                              <BedDouble className="size-3.5" /> {b.hotel ? "View hotel" : "Assign hotel"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-signal focus:bg-signal-soft"
                              onSelect={(e) => {
                                e.preventDefault();
                                setDeleteTarget(b);
                              }}
                            >
                              <Trash2 className="size-3.5" /> Delete booking
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>

                  {expanded === b.id && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-secondary/30 py-4">
                        {b.hotel ? (
                          <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                              <div>
                                <p className="text-slate-soft">Hotel</p>
                                <p className="font-medium text-ink-text">{b.hotel.hotelName}</p>
                              </div>
                              <div>
                                <p className="text-slate-soft">Room</p>
                                <p className="text-ink-text">{b.hotel.roomType} · {b.hotel.roomCount} room(s)</p>
                              </div>
                              <div>
                                <p className="text-slate-soft">Stay</p>
                                <p className="font-mono-data text-ink-text">{b.hotel.checkIn} → {b.hotel.checkOut}</p>
                              </div>
                              <div>
                                <p className="text-slate-soft">Amount</p>
                                <p className="font-mono-data text-ink-text">₹{b.hotel.amount.toLocaleString("en-IN")}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-slate-soft">Address</p>
                                <p className="text-ink-text">{b.hotel.address}</p>
                              </div>
                              <div>
                                <p className="text-slate-soft">Reference</p>
                                <p className="font-mono-data text-ink-text">{b.hotel.referenceNumber}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <BookingFormDialog
                                booking={b}
                                drivers={state.drivers}
                                trigger={<Button size="sm" variant="outline"><Pencil className="size-3.5" /> Edit</Button>}
                                onSubmit={saveBooking}
                              />
                              <Button size="sm" variant="outline" onClick={dropHotel}>
                                <X className="size-3.5" /> Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-card p-4">
                            <div>
                              <p className="text-sm font-medium text-ink-text">No hotel assigned</p>
                              <p className="text-xs text-muted-foreground">
                                Optional — add once availability is confirmed with the hotel directly.
                              </p>
                            </div>
                            <BookingFormDialog
                              booking={b}
                              drivers={state.drivers}
                              trigger={<Button size="sm" variant="marigold"><BedDouble className="size-3.5" /> Assign hotel</Button>}
                              onSubmit={saveBooking}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
                );
              })}
              {state.bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    No bookings yet — create one from a confirmed lead.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this booking?"
        description={`${deleteTarget?.customer ?? ""} (${deleteTarget?.id ?? ""}) and its hotel details, if any, will be removed.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteBooking(deleteTarget.id);
            toast({ variant: "info", title: "Booking deleted", description: `${deleteTarget.id} was removed.` });
          }
        }}
      />
    </Shell>
  );
}
