"use client";

import * as React from "react";
import {
  BedDouble,
  ChevronDown,
  Filter,
  History,
  MoreHorizontal,
  MessageCircle,
  Plus,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BookingFormDialog } from "@/components/crm/booking-form-dialog";
import { BookingCommentsDrawer } from "@/components/crm/booking-comments-drawer";
import { BookingHistoryDrawer } from "@/components/crm/booking-history-drawer";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Booking, BookingStatus, bookingRoute, makeLeadHistoryEvent, trackedWebsites } from "@/lib/data";
import { DatePicker, formatDisplayDate, parseStoredDate } from "@/components/crm/date-picker";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";

const websiteNames = trackedWebsites.map((w) => w.name);

const statuses: BookingStatus[] = [
  "Advance Pending",
  "Advance Received",
  "Balance Pending",
  "Fully Paid",
  "Cancelled",
  "Refunded",
];

const stickyActionHead =
  "sticky right-0 top-0 z-30 min-w-[8.5rem] whitespace-nowrap border-l border-border-soft bg-card";
const stickyActionCell =
  "relative sticky right-0 z-20 min-w-[8.5rem] border-l border-border-soft bg-card before:absolute before:inset-0 before:-z-10 before:bg-card before:content-[''] group-hover:bg-secondary group-hover:before:bg-secondary";

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function MultiFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const count = selected.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal">
          <Filter className="size-3.5 text-slate-soft" />
          {label}
          {count > 0 ? (
            <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1.5">
              {count}
            </Badge>
          ) : (
            <ChevronDown className="size-3.5 text-slate-soft" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[11rem]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.includes(option)}
            onCheckedChange={() => onChange(toggleValue(selected, option))}
            onSelect={(e) => e.preventDefault()}
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
        {count > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-slate" onSelect={() => onChange([])}>
              Clear {label.toLowerCase()}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function BookingsPage() {
  const { state, addBooking, updateBooking, deleteBooking } = useData();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<BookingStatus[]>([]);
  const [driverFilter, setDriverFilter] = React.useState<string[]>([]);
  const [hotelFilter, setHotelFilter] = React.useState<Array<"With hotel" | "No hotel">>([]);
  const [websiteFilter, setWebsiteFilter] = React.useState<string[]>([]);
  const [travelFrom, setTravelFrom] = React.useState("");
  const [travelTo, setTravelTo] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<Booking | null>(null);
  const [commentBookingId, setCommentBookingId] = React.useState<string | null>(null);
  const [historyBookingId, setHistoryBookingId] = React.useState<string | null>(null);

  const driverNames = React.useMemo(
    () => [...new Set(state.bookings.map((b) => b.driver).filter(Boolean))].sort(),
    [state.bookings]
  );

  const commentBooking = commentBookingId
    ? state.bookings.find((b) => b.id === commentBookingId) ?? null
    : null;
  const historyBooking = historyBookingId
    ? state.bookings.find((b) => b.id === historyBookingId) ?? null
    : null;

  function track(
    booking: Booking,
    action: Parameters<typeof makeLeadHistoryEvent>[0],
    label: string,
    detail?: string
  ) {
    return [...(booking.history ?? []), makeLeadHistoryEvent(action, label, { detail })];
  }

  const hasFilters =
    query.trim().length > 0 ||
    statusFilter.length > 0 ||
    driverFilter.length > 0 ||
    hotelFilter.length > 0 ||
    websiteFilter.length > 0 ||
    travelFrom.length > 0 ||
    travelTo.length > 0;

  const visible = state.bookings.filter((b) => {
    const q = query.trim().toLowerCase();
    if (q) {
      const matchesCustomer = b.customer.toLowerCase().includes(q);
      const matchesEmail = b.email.toLowerCase().includes(q);
      const matchesPhone = (b.phone ?? "").toLowerCase().includes(q);
      const matchesId = b.id.toLowerCase().includes(q);
      if (!matchesCustomer && !matchesEmail && !matchesPhone && !matchesId) return false;
    }
    if (statusFilter.length > 0 && !statusFilter.includes(b.status)) return false;
    if (driverFilter.length > 0 && !driverFilter.includes(b.driver)) return false;
    if (websiteFilter.length > 0 && (!b.website || !websiteFilter.includes(b.website))) return false;
    if (hotelFilter.length > 0) {
      const withHotel = !!b.hotel;
      const ok =
        (hotelFilter.includes("With hotel") && withHotel) ||
        (hotelFilter.includes("No hotel") && !withHotel);
      if (!ok) return false;
    }
    if (travelFrom || travelTo) {
      const travel = parseStoredDate(b.travelDate);
      if (!travel) return false;
      if (travelFrom) {
        const from = parseStoredDate(travelFrom);
        if (from && travel < from) return false;
      }
      if (travelTo) {
        const to = parseStoredDate(travelTo);
        if (to && travel > to) return false;
      }
    }
    return true;
  });

  const totalRevenue = state.bookings
    .filter((b) => b.status !== "Cancelled" && b.status !== "Refunded")
    .reduce((s, b) => s + b.total, 0);
  const pendingBalance = state.bookings.reduce((s, b) => s + b.balance, 0);
  const withHotel = state.bookings.filter((b) => b.hotel).length;

  return (
    <Shell>
      <Topbar
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
              addBooking({
                ...data,
                history: [
                  makeLeadHistoryEvent("created", "Booking created", {
                    detail: `Dummy · ${bookingRoute(data)}`,
                  }),
                  ...(data.driver
                    ? [
                        makeLeadHistoryEvent("assigned", "Driver assigned", {
                          detail: `${data.driver} · ${data.vehicle}`,
                        }),
                      ]
                    : []),
                ],
              });
              toast({
                variant: "success",
                title: "Booking created",
                description: `${data.customer}'s trip is on the books.`,
              });
            }}
          />
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-4 grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
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

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-col gap-3 border-b border-border-soft bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-soft" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email, phone or ID…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <MultiFilter
                label="Website"
                options={websiteNames}
                selected={websiteFilter}
                onChange={setWebsiteFilter}
              />
              <MultiFilter
                label="Payment status"
                options={statuses}
                selected={statusFilter}
                onChange={setStatusFilter}
              />
              <MultiFilter
                label="Driver"
                options={driverNames}
                selected={driverFilter}
                onChange={setDriverFilter}
              />
              <MultiFilter
                label="Hotel"
                options={["With hotel", "No hotel"] as const}
                selected={hotelFilter}
                onChange={setHotelFilter}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-soft">Travel</span>
                <DatePicker
                  value={travelFrom}
                  onChange={setTravelFrom}
                  placeholder="From"
                  className="h-8 w-[8.5rem] text-xs"
                />
                <span className="text-[11px] text-slate-soft">to</span>
                <DatePicker
                  value={travelTo}
                  onChange={setTravelTo}
                  placeholder="To"
                  className="h-8 w-[8.5rem] text-xs"
                />
              </div>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-slate"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter([]);
                    setDriverFilter([]);
                    setHotelFilter([]);
                    setWebsiteFilter([]);
                    setTravelFrom("");
                    setTravelTo("");
                  }}
                >
                  <X className="size-3.5" /> Clear filters
                </Button>
              )}
            </div>
          </div>

          <div className="hidden min-h-0 flex-1 md:block">
          <Table containerClassName="min-h-0 flex-1 overflow-auto">
            <TableHeader>
              <TableRow className="group hover:bg-transparent">
                <TableHead className="sticky top-0 z-20 bg-card">Booking</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Tour package / Route</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Travel dates</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Cab / pax / days</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Driver / Vehicle</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right whitespace-nowrap">Total</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right whitespace-nowrap">Advance</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right whitespace-nowrap">Balance</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Payment status</TableHead>
                <TableHead className={`text-right ${stickyActionHead}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((b) => (
                <TableRow key={b.id} className="group">
                  <TableCell>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-ink-text">
                        <span className="truncate">{b.customer}</span>
                        {b.hotel && <BedDouble className="size-3.5 shrink-0 text-marigold-ink" />}
                      </p>
                      <p className="font-mono-data text-[11px] text-slate-soft">{b.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <p className="truncate text-sm text-ink-text">{b.tourPackage}</p>
                    <p className="truncate text-[11px] text-slate-soft">{bookingRoute(b)}</p>
                  </TableCell>
                  <TableCell className="text-sm text-slate">
                    <p>{formatDisplayDate(b.travelDate)}</p>
                    {b.returnDate ? (
                      <p className="text-[11px] text-slate-soft">to {formatDisplayDate(b.returnDate)}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-slate">
                    {b.cabType}{" "}
                    <span className="text-slate-soft">
                      · {b.adults}A{b.kids > 0 ? `+${b.kids}K` : ""} · {b.days}d
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-ink-text">{b.driver || "—"}</p>
                    <p className="font-mono-data text-[11px] text-slate-soft">{b.vehicle || "—"}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono-data text-sm text-ink-text">
                    ₹{b.total.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono-data text-sm text-teal">
                    ₹{b.advance.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap pr-6 text-right font-mono-data text-sm text-signal">
                    {b.balance > 0 ? `₹${b.balance.toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-1"
                          aria-label={`Change payment status for ${b.customer}`}
                        >
                          <StatusBadge status={b.status} />
                          <ChevronDown className="size-3.5 text-slate-soft" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Set payment status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {statuses.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            disabled={s === b.status}
                            onSelect={() => {
                              updateBooking(b.id, {
                                status: s,
                                history: track(
                                  b,
                                  "status_changed",
                                  `Payment status changed to ${s}`,
                                  `${b.status} → ${s} · Dummy tracking`
                                ),
                              });
                              toast({
                                variant: "success",
                                title: "Payment status updated",
                                description: `${b.id} moved to ${s}.`,
                              });
                            }}
                          >
                            <StatusBadge status={s} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className={stickyActionCell}>
                    <div className="relative z-10 flex items-center justify-end gap-1 bg-inherit">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Tracking history for ${b.customer}`}
                        onClick={() => setHistoryBookingId(b.id)}
                      >
                        <History className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Comments for ${b.customer}`}
                        onClick={() => setCommentBookingId(b.id)}
                      >
                        <MessageCircle className="size-3.5" />
                      </Button>
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
                            onSubmit={(data) => {
                              updateBooking(b.id, {
                                ...data,
                                history: track(
                                  b,
                                  "updated",
                                  "Booking details updated",
                                  data.hotel
                                    ? `Dummy · hotel ${data.hotel.hotelName || "assigned"}`
                                    : "Dummy · edited by Priya"
                                ),
                              });
                              toast({
                                variant: "success",
                                title: "Booking updated",
                                description: `${b.id} saved successfully.`,
                              });
                            }}
                          />
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
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                    No bookings match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:hidden">
            {visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No bookings match these filters.
              </p>
            ) : (
              visible.map((b) => (
                <RecordCard key={b.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-base font-semibold break-words text-ink-text">
                        {b.customer}
                        {b.hotel ? <BedDouble className="size-3.5 shrink-0 text-marigold-ink" /> : null}
                      </p>
                      <p className="font-mono-data text-[11px] text-slate-soft">{b.id}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="inline-flex items-center gap-1">
                          <StatusBadge status={b.status} />
                          <ChevronDown className="size-3.5 text-slate-soft" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Set payment status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {statuses.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            disabled={s === b.status}
                            onSelect={() => {
                              updateBooking(b.id, {
                                status: s,
                                history: track(
                                  b,
                                  "status_changed",
                                  `Payment status changed to ${s}`,
                                  `${b.status} → ${s} · Dummy tracking`
                                ),
                              });
                              toast({
                                variant: "success",
                                title: "Payment status updated",
                                description: `${b.id} moved to ${s}.`,
                              });
                            }}
                          >
                            <StatusBadge status={s} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <InfoGrid>
                    <InfoItem label="Tour package" className="sm:col-span-2">
                      {b.tourPackage}
                    </InfoItem>
                    <InfoItem label="Route" className="sm:col-span-2">
                      {bookingRoute(b)}
                    </InfoItem>
                    <InfoItem label="Travel dates">
                      {formatDisplayDate(b.travelDate)}
                      {b.returnDate ? ` → ${formatDisplayDate(b.returnDate)}` : ""}
                    </InfoItem>
                    <InfoItem label="Cab / pax / days">
                      {b.cabType} · {b.adults}A{b.kids > 0 ? `+${b.kids}K` : ""} · {b.days}d
                    </InfoItem>
                    <InfoItem label="Driver">{b.driver || "—"}</InfoItem>
                    <InfoItem label="Vehicle">{b.vehicle || "—"}</InfoItem>
                    <InfoItem label="Total">₹{b.total.toLocaleString("en-IN")}</InfoItem>
                    <InfoItem label="Advance">₹{b.advance.toLocaleString("en-IN")}</InfoItem>
                    <InfoItem label="Balance">
                      {b.balance > 0 ? `₹${b.balance.toLocaleString("en-IN")}` : "—"}
                    </InfoItem>
                    {b.hotel ? (
                      <InfoItem label="Hotel" className="sm:col-span-2">
                        {b.hotel.hotelName}
                      </InfoItem>
                    ) : null}
                  </InfoGrid>
                  <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                    <Button size="sm" variant="outline" onClick={() => setHistoryBookingId(b.id)}>
                      <History className="size-3.5" /> History
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCommentBookingId(b.id)}>
                      <MessageCircle className="size-3.5" /> Comments
                    </Button>
                    <BookingFormDialog
                      booking={b}
                      drivers={state.drivers}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                      }
                      onSubmit={(data) => {
                        updateBooking(b.id, {
                          ...data,
                          history: track(
                            b,
                            "updated",
                            "Booking details updated",
                            data.hotel
                              ? `Dummy · hotel ${data.hotel.hotelName || "assigned"}`
                              : "Dummy · edited by Priya"
                          ),
                        });
                        toast({
                          variant: "success",
                          title: "Booking updated",
                          description: `${b.id} saved successfully.`,
                        });
                      }}
                    />
                    <Button size="sm" variant="outline" className="text-signal" onClick={() => setDeleteTarget(b)}>
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </div>
                </RecordCard>
              ))
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-border-soft bg-card px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <span>
              Showing {visible.length} of {state.bookings.length} bookings
            </span>
          </div>
        </Card>
      </main>

      <BookingCommentsDrawer
        booking={commentBooking}
        open={!!commentBookingId}
        onOpenChange={(v) => !v && setCommentBookingId(null)}
        onAddComment={(bookingId, comment) => {
          const current = state.bookings.find((b) => b.id === bookingId);
          if (!current) return;
          updateBooking(bookingId, {
            comments: [...(current.comments ?? []), comment],
            history: track(current, "comment_added", "Comment added", comment.text),
          });
          toast({
            variant: "success",
            title: "Comment added",
            description: `Note saved on ${current.customer}.`,
          });
        }}
      />

      <BookingHistoryDrawer
        booking={historyBooking}
        open={!!historyBookingId}
        onOpenChange={(v) => !v && setHistoryBookingId(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this booking?"
        description={`${deleteTarget?.customer ?? ""} (${deleteTarget?.id ?? ""}) and its hotel details, if any, will be removed.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteBooking(deleteTarget.id);
            toast({
              variant: "info",
              title: "Booking deleted",
              description: `${deleteTarget.id} was removed.`,
            });
          }
        }}
      />
    </Shell>
  );
}
