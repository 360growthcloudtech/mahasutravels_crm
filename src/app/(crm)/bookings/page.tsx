"use client";

import * as React from "react";
import {
  BedDouble,
  ChevronDown,
  Download,
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
import { Topbar } from "@/components/crm/topbar";
import { TableRefreshButton } from "@/components/crm/table-refresh-button";
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
import {
  RecordCardsSkeleton,
  StatCardsSkeleton,
  TableRowsSkeleton,
} from "@/components/crm/skeletons";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { downloadBookingsCsv } from "@/lib/bookings-api";
import { BookingsExportDialog } from "@/components/crm/bookings-export-dialog";
import { useHasPermission } from "@/lib/use-has-permission";
import { Booking, BookingStatus, Driver, bookingRoute, makeLeadHistoryEvent, trackedWebsites } from "@/lib/data";
import { assignedVehicleLabel, bookingDrivers, bookingHotels } from "@/lib/booking-utils";
import { DatePicker, formatDisplayDate, parseStoredDate } from "@/components/crm/date-picker";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import { CreatedAtDisplay } from "@/components/crm/created-at-display";

function formatDriversLabel(b: Booking) {
  const list = bookingDrivers(b);
  if (!list.length) return "—";
  if (list.length === 1) return list[0].driver;
  return `${list[0].driver} +${list.length - 1}`;
}

function formatVehiclesLabel(b: Booking, drivers: Driver[]) {
  const list = bookingDrivers(b);
  if (!list.length) return "—";
  if (list.length === 1) return assignedVehicleLabel(list[0], drivers);
  return `${assignedVehicleLabel(list[0], drivers)} +${list.length - 1}`;
}

function formatHotelsLabel(b: Booking) {
  const list = bookingHotels(b);
  if (!list.length) return null;
  if (list.length === 1) return list[0].hotelName;
  return `${list[0].hotelName} +${list.length - 1}`;
}

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
  const { state, bookingsLoading, refreshBookings, addBooking, updateBooking, deleteBooking } =
    useData();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [searchUnlocked, setSearchUnlocked] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<BookingStatus[]>([]);
  const [driverFilter, setDriverFilter] = React.useState<string[]>([]);
  const [hotelFilter, setHotelFilter] = React.useState<Array<"With hotel" | "No hotel">>([]);
  const [websiteFilter, setWebsiteFilter] = React.useState<string[]>([]);
  const [travelFrom, setTravelFrom] = React.useState("");
  const [travelTo, setTravelTo] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<Booking | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [commentBookingId, setCommentBookingId] = React.useState<string | null>(null);
  const [historyBookingId, setHistoryBookingId] = React.useState<string | null>(null);
  const [editingBookingId, setEditingBookingId] = React.useState<string | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const canExportBookings = useHasPermission("bookings.export");
  const canCreateBooking = useHasPermission("bookings.create");
  const canEditBooking = useHasPermission("bookings.edit");
  const canDeleteBooking = useHasPermission("bookings.delete");
  const canCommentBooking = useHasPermission("bookings.comment");

  const driverNames = React.useMemo(
    () =>
      [
        ...new Set(
          state.bookings.flatMap((b) => bookingDrivers(b).map((d) => d.driver)).filter(Boolean)
        ),
      ].sort(),
    [state.bookings]
  );

  const commentBooking = commentBookingId
    ? state.bookings.find((b) => b.id === commentBookingId) ?? null
    : null;
  const historyBooking = historyBookingId
    ? state.bookings.find((b) => b.id === historyBookingId) ?? null
    : null;
  const editingBooking = editingBookingId
    ? state.bookings.find((b) => b.id === editingBookingId) ?? null
    : null;

  function track(
    booking: Booking,
    action: Parameters<typeof makeLeadHistoryEvent>[0],
    label: string,
    detail?: string
  ) {
    return [...(booking.history ?? []), makeLeadHistoryEvent(action, label, { detail })];
  }

  async function handleCreate(data: Omit<Booking, "id" | "bookingNo">) {
    try {
      await addBooking({
        ...data,
        history: [
          makeLeadHistoryEvent("created", "Booking created", {
            detail: bookingRoute(data),
          }),
          ...(bookingDrivers(data).length
            ? [
                makeLeadHistoryEvent("assigned", "Driver assigned", {
                  detail: bookingDrivers(data)
                    .map((d) => `${d.driver}${d.vehicle ? ` · ${d.vehicle}` : ""}`)
                    .join(", "),
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
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not create booking",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  async function handleUpdate(id: string, data: Omit<Booking, "id" | "bookingNo">, existing: Booking) {
    try {
      await updateBooking(id, {
        ...data,
        history: track(
          existing,
          "updated",
          "Booking details updated",
          data.hotels?.length || data.hotel
            ? `Hotel ${bookingHotels(data)
                .map((h) => h.hotelName)
                .filter(Boolean)
                .join(", ") || "assigned"}`
            : "Details updated"
        ),
      });
      toast({
        variant: "success",
        title: "Booking updated",
        description: `${existing.bookingNo ?? existing.id} saved successfully.`,
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update booking",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  async function handleStatusChange(b: Booking, s: BookingStatus) {
    try {
      await updateBooking(b.id, {
        status: s,
        history: track(b, "status_changed", `Payment status changed to ${s}`, `${b.status} → ${s}`),
      });
      toast({
        variant: "success",
        title: "Payment status updated",
        description: `${b.bookingNo ?? b.id} moved to ${s}.`,
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update status",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBooking(deleteTarget.id);
      toast({
        variant: "info",
        title: "Booking deleted",
        description: `${deleteTarget.bookingNo ?? deleteTarget.id} was removed.`,
      });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not delete booking",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters =
    query.trim().length > 0 ||
    statusFilter.length > 0 ||
    driverFilter.length > 0 ||
    hotelFilter.length > 0 ||
    websiteFilter.length > 0 ||
    travelFrom.length > 0 ||
    travelTo.length > 0;

  const exportInitialFilters = React.useMemo(
    () => ({
      search: query,
      status: statusFilter,
      website: websiteFilter,
      driver: driverFilter,
      travelFrom,
      travelTo,
      hotel: hotelFilter,
    }),
    [query, statusFilter, websiteFilter, driverFilter, travelFrom, travelTo, hotelFilter]
  );

  const visible = state.bookings.filter((b) => {
    const q = query.trim().toLowerCase();
    if (q) {
      const matchesCustomer = b.customer.toLowerCase().includes(q);
      const matchesEmail = b.email.toLowerCase().includes(q);
      const matchesPhone = (b.phone ?? "").toLowerCase().includes(q);
      const matchesId =
        b.id.toLowerCase().includes(q) || (b.bookingNo ?? "").toLowerCase().includes(q);
      if (!matchesCustomer && !matchesEmail && !matchesPhone && !matchesId) return false;
    }
    if (statusFilter.length > 0 && !statusFilter.includes(b.status)) return false;
    if (driverFilter.length > 0) {
      const names = bookingDrivers(b).map((d) => d.driver);
      if (!names.some((name) => driverFilter.includes(name))) return false;
    }
    if (websiteFilter.length > 0 && (!b.website || !websiteFilter.includes(b.website))) return false;
    if (hotelFilter.length > 0) {
      const withHotel = bookingHotels(b).length > 0;
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
  const withHotel = state.bookings.filter((b) => bookingHotels(b).length > 0).length;

  return (
    <>
      <Topbar
        title="Bookings"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TableRefreshButton onRefresh={refreshBookings} loading={bookingsLoading} />
            {canCreateBooking ? (
              <BookingFormDialog
                trigger={
                  <Button variant="marigold">
                    <Plus className="size-4" /> New Booking
                  </Button>
                }
                drivers={state.drivers}
                onSubmit={handleCreate}
              />
            ) : null}
          </div>
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col overflow-hidden">
        {bookingsLoading ? (
          <StatCardsSkeleton />
        ) : (
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
        )}

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
                  type="search"
                  name="bookings-list-search"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  readOnly={!searchUnlocked}
                  onFocus={() => setSearchUnlocked(true)}
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
            {canExportBookings ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 shrink-0"
                disabled={exporting || bookingsLoading}
                onClick={() => setExportOpen(true)}
              >
                <Download className="size-3.5" />
                Export CSV
              </Button>
            ) : null}
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
                <TableHead className="sticky top-0 z-20 bg-card whitespace-nowrap">Created</TableHead>
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
                        {bookingHotels(b).length > 0 && (
                          <BedDouble className="size-3.5 shrink-0 text-marigold-ink" />
                        )}
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
                    <p className="text-sm text-ink-text">{formatDriversLabel(b)}</p>
                    <p className="font-mono-data text-[11px] text-slate-soft">{formatVehiclesLabel(b, state.drivers)}</p>
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
                    <div className="space-y-0.5">
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
                                void handleStatusChange(b, s);
                              }}
                            >
                              <StatusBadge status={s} />
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {b.paymentMode ? (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {b.paymentMode}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate">
                    <CreatedAtDisplay iso={b.createdAt} stacked />
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
                      {canCommentBooking ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Comments for ${b.customer}`}
                        onClick={() => setCommentBookingId(b.id)}
                      >
                        <MessageCircle className="size-3.5" />
                      </Button>
                      ) : null}
                      {canEditBooking || canDeleteBooking ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEditBooking ? (
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditingBookingId(b.id);
                            }}
                          >
                            <Pencil className="size-3.5" /> Edit booking
                          </DropdownMenuItem>
                          ) : null}
                          {canEditBooking && canDeleteBooking ? <DropdownMenuSeparator /> : null}
                          {canDeleteBooking ? (
                          <DropdownMenuItem
                            className="text-signal focus:bg-signal-soft"
                            onSelect={(e) => {
                              e.preventDefault();
                              setDeleteTarget(b);
                            }}
                          >
                            <Trash2 className="size-3.5" /> Delete booking
                          </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
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
                        {bookingHotels(b).length > 0 ? (
                          <BedDouble className="size-3.5 shrink-0 text-marigold-ink" />
                        ) : null}
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
                              void handleStatusChange(b, s);
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
                    <InfoItem label="Driver">{formatDriversLabel(b)}</InfoItem>
                    <InfoItem label="Vehicle">{formatVehiclesLabel(b, state.drivers)}</InfoItem>
                    <InfoItem label="Total">₹{b.total.toLocaleString("en-IN")}</InfoItem>
                    <InfoItem label="Advance">₹{b.advance.toLocaleString("en-IN")}</InfoItem>
                    <InfoItem label="Balance">
                      {b.balance > 0 ? `₹${b.balance.toLocaleString("en-IN")}` : "—"}
                    </InfoItem>
                    <InfoItem label="Payment mode">{b.paymentMode || "—"}</InfoItem>
                    <InfoItem label="Created">
                      <CreatedAtDisplay iso={b.createdAt} />
                    </InfoItem>
                    {formatHotelsLabel(b) ? (
                      <InfoItem label="Hotel" className="sm:col-span-2">
                        {formatHotelsLabel(b)}
                      </InfoItem>
                    ) : null}
                  </InfoGrid>
                  <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                    <Button size="sm" variant="outline" onClick={() => setHistoryBookingId(b.id)}>
                      <History className="size-3.5" /> History
                    </Button>
                    {canCommentBooking ? (
                    <Button size="sm" variant="outline" onClick={() => setCommentBookingId(b.id)}>
                      <MessageCircle className="size-3.5" /> Comments
                    </Button>
                    ) : null}
                    {canEditBooking ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingBookingId(b.id)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    ) : null}
                    {canDeleteBooking ? (
                    <Button size="sm" variant="outline" className="text-signal" onClick={() => setDeleteTarget(b)}>
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                    ) : null}
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

      <BookingFormDialog
        booking={editingBooking ?? undefined}
        drivers={state.drivers}
        open={!!editingBooking}
        onOpenChange={(open) => {
          if (!open) setEditingBookingId(null);
        }}
        onSubmit={async (data) => {
          if (!editingBooking) return;
          await handleUpdate(editingBooking.id, data, editingBooking);
          setEditingBookingId(null);
        }}
      />

      <BookingCommentsDrawer
        booking={commentBooking}
        open={!!commentBookingId}
        onOpenChange={(v) => !v && setCommentBookingId(null)}
        onAddComment={async (bookingId, comment) => {
          const current = state.bookings.find((b) => b.id === bookingId);
          if (!current) return;
          try {
            await updateBooking(bookingId, {
              comments: [...(current.comments ?? []), comment],
              history: track(current, "comment_added", "Comment added", comment.text),
            });
            toast({
              variant: "success",
              title: "Comment added",
              description: `Note saved on ${current.customer}.`,
            });
          } catch (error) {
            toast({
              variant: "error",
              title: "Could not add comment",
              description: error instanceof Error ? error.message : "Please try again.",
            });
          }
        }}
      />

      <BookingHistoryDrawer
        booking={historyBooking}
        open={!!historyBookingId}
        onOpenChange={(v) => !v && setHistoryBookingId(null)}
      />

      <BookingsExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        initialFilters={exportInitialFilters}
        statusOptions={statuses}
        websiteOptions={websiteNames}
        driverOptions={driverNames}
        exporting={exporting}
        onExport={async (query) => {
          setExporting(true);
          try {
            return await downloadBookingsCsv(query);
          } finally {
            setExporting(false);
          }
        }}
        onSuccess={(count, filtered) => {
          toast({
            variant: "success",
            title: count === 0 ? "Exported headers only" : "Export ready",
            description:
              count === 0
                ? "No bookings matched your export filters."
                : `Exported ${count} booking${count === 1 ? "" : "s"}${filtered ? " (filtered)" : ""}.`,
          });
        }}
        onError={(message) => {
          toast({
            variant: "error",
            title: "Could not export bookings",
            description: message,
          });
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && !deleting && setDeleteTarget(null)}
        title="Delete this booking?"
        description={`${deleteTarget?.customer ?? ""} (${deleteTarget?.bookingNo ?? deleteTarget?.id ?? ""}) and its hotel details, if any, will be removed.`}
        confirming={deleting}
        closeOnConfirm={false}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
