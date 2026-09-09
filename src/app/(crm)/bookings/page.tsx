"use client";

import * as React from "react";
import {
  BedDouble,
  ChevronDown,
  Download,
  Filter,
  History,
  MessageCircle,
  Plus,
  Pencil,
  Receipt,
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
import { BookingInvoiceDrawer } from "@/components/crm/booking-invoice-drawer";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import {
  RecordCardsSkeleton,
  StatCardsSkeleton,
} from "@/components/crm/skeletons";
import { CrmGrid, type GridPageRequest } from "@/components/crm/grid/crm-grid";
import {
  buildBookingsColumnDefs,
  type BookingsGridActions,
} from "@/components/crm/grid/bookings-grid-columns";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import {
  bookingFromApi,
  downloadBookingsCsv,
  fetchBookingsPage,
} from "@/lib/bookings-api";
import { BookingsExportDialog } from "@/components/crm/bookings-export-dialog";
import { useHasPermission } from "@/lib/use-has-permission";
import { Booking, BookingStatus, bookingRoute, makeLeadHistoryEvent } from "@/lib/data";
import { assignedVehicleLabel, bookingDrivers, bookingHotels } from "@/lib/booking-utils";
import { DatePicker, formatDisplayDate } from "@/components/crm/date-picker";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import { CreatedAtDisplay } from "@/components/crm/created-at-display";
import { PagePagination } from "@/components/crm/list-pagination";
import type { GridApi } from "ag-grid-community";

const BOOKINGS_PAGE_SIZE = 25;

const statuses: BookingStatus[] = [
  "Advance Pending",
  "Advance Received",
  "Balance Pending",
  "Fully Paid",
  "Cancelled",
  "Refunded",
];

function formatDriversLabel(b: Booking) {
  const list = bookingDrivers(b);
  if (!list.length) return "—";
  if (list.length === 1) return list[0].driver;
  return `${list[0].driver} +${list.length - 1}`;
}

function formatVehiclesLabel(b: Booking, drivers: Parameters<typeof assignedVehicleLabel>[1]) {
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
  const { state, websites, refreshBookings, addBooking, updateBooking, deleteBooking } =
    useData();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [searchUnlocked, setSearchUnlocked] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<BookingStatus[]>([]);
  const [driverFilter, setDriverFilter] = React.useState<string[]>([]);
  const [hotelFilter, setHotelFilter] = React.useState<Array<"With hotel" | "No hotel">>([]);
  const [websiteFilter, setWebsiteFilter] = React.useState<string[]>([]);
  const [travelFrom, setTravelFrom] = React.useState("");
  const [travelTo, setTravelTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageBookings, setPageBookings] = React.useState<Booking[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listStats, setListStats] = React.useState({
    total: 0,
    revenue: 0,
    pending_balance: 0,
    with_hotel: 0,
  });
  const [listPagination, setListPagination] = React.useState({
    page: 1,
    pageSize: BOOKINGS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [deleteTarget, setDeleteTarget] = React.useState<Booking | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [commentBookingId, setCommentBookingId] = React.useState<string | null>(null);
  const [historyBookingId, setHistoryBookingId] = React.useState<string | null>(null);
  const [invoiceBookingId, setInvoiceBookingId] = React.useState<string | null>(null);
  const [editingBookingId, setEditingBookingId] = React.useState<string | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const canExportBookings = useHasPermission("bookings.export");
  const canCreateBooking = useHasPermission("bookings.create");
  const canEditBooking = useHasPermission("bookings.edit");
  const canDeleteBooking = useHasPermission("bookings.delete");
  const canCommentBooking = useHasPermission("bookings.comment");
  const gridApiRef = React.useRef<GridApi<Booking> | null>(null);
  const columnDefs = React.useMemo(() => buildBookingsColumnDefs(), []);
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const websiteDomains = React.useMemo(() => websites.map((w) => w.domain), [websites]);

  React.useEffect(() => {
    setWebsiteFilter((prev) => prev.filter((d) => websiteDomains.includes(d)));
  }, [websiteDomains.join("|")]);

  const driverNames = React.useMemo(
    () =>
      [
        ...new Set(
          state.bookings.flatMap((b) => bookingDrivers(b).map((d) => d.driver)).filter(Boolean)
        ),
      ].sort(),
    [state.bookings]
  );

  const filterKey = [
    debouncedQuery,
    statusFilter.join(","),
    driverFilter.join(","),
    hotelFilter.join(","),
    websiteFilter.join(","),
    travelFrom,
    travelTo,
  ].join("|");

  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const toolbarFilters = React.useMemo(
    () => ({
      search: debouncedQuery || undefined,
      status: statusFilter.length ? statusFilter : undefined,
      website: websiteFilter.length ? websiteFilter : undefined,
      driver: driverFilter.length ? driverFilter : undefined,
      travel_from: travelFrom || undefined,
      travel_to: travelTo || undefined,
      hotel: hotelFilter.length
        ? hotelFilter.map((h) => (h === "With hotel" ? ("with_hotel" as const) : ("no_hotel" as const)))
        : undefined,
    }),
    [debouncedQuery, statusFilter, websiteFilter, driverFilter, travelFrom, travelTo, hotelFilter]
  );

  const loadBookingsPage = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchBookingsPage({
        ...toolbarFilters,
        page,
        pageSize: BOOKINGS_PAGE_SIZE,
      });
      setPageBookings(data.bookings.map(bookingFromApi));
      setListStats(data.stats);
      setListPagination(data.pagination);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load bookings",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setListLoading(false);
    }
  }, [toolbarFilters, page, toast]);

  React.useEffect(() => {
    if (isDesktop) return;
    void loadBookingsPage();
  }, [loadBookingsPage, isDesktop]);

  React.useEffect(() => {
    if (listPagination.totalPages > 0 && page > listPagination.totalPages) {
      setPage(listPagination.totalPages);
    }
  }, [listPagination.totalPages, page]);

  async function reloadBookings() {
    gridApiRef.current?.refreshInfiniteCache();
    if (!isDesktop) await loadBookingsPage();
    await refreshBookings();
  }

  const fetchGridPage = React.useCallback(
    async (request: GridPageRequest) => {
      const data = await fetchBookingsPage({
        ...toolbarFilters,
        page: request.page,
        pageSize: request.pageSize,
        sortBy: request.sortBy,
        sortDir: request.sortDir,
        colFilters: request.colFilters,
      });
      return {
        rows: data.bookings.map(bookingFromApi),
        total: data.pagination.total,
        stats: data.stats,
      };
    },
    [toolbarFilters]
  );

  function findBooking(id: string | null): Booking | null {
    if (!id) return null;
    return (
      pageBookings.find((b) => b.id === id) ??
      state.bookings.find((b) => b.id === id) ??
      null
    );
  }

  const commentBooking = findBooking(commentBookingId);
  const historyBooking = findBooking(historyBookingId);
  const invoiceBooking = findBooking(invoiceBookingId);
  const editingBooking = findBooking(editingBookingId);

  const gridActions = React.useMemo<BookingsGridActions>(
    () => ({
      statuses,
      drivers: state.drivers,
      canCommentBooking,
      canEditBooking,
      canDeleteBooking,
      onStatusChange: (booking, status) => {
        void handleStatusChange(booking, status);
      },
      onHistory: (booking) => setHistoryBookingId(booking.id),
      onComments: (booking) => setCommentBookingId(booking.id),
      onInvoice: (booking) => setInvoiceBookingId(booking.id),
      onEdit: (booking) => setEditingBookingId(booking.id),
      onDelete: (booking) => setDeleteTarget(booking),
    }),
    [state.drivers, canCommentBooking, canEditBooking, canDeleteBooking]
  );

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
      void reloadBookings();
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
      void reloadBookings();
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
      void reloadBookings();
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
      void reloadBookings();
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
    debouncedQuery.length > 0 ||
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

  const visible = pageBookings;
  const rangeStart =
    listPagination.total === 0 ? 0 : (listPagination.page - 1) * listPagination.pageSize + 1;
  const rangeEnd = Math.min(
    listPagination.page * listPagination.pageSize,
    listPagination.total
  );

  return (
    <>
      <Topbar
        title="Bookings"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TableRefreshButton onRefresh={reloadBookings} loading={listLoading} />
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
        {listLoading && listStats.total === 0 ? (
          <StatCardsSkeleton className="shrink-0 gap-4" />
        ) : (
          <div className="mb-4 grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active bookings</p>
                <p className="mt-1 font-display text-xl font-semibold">{listStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Confirmed revenue</p>
                <p className="mt-1 font-display text-xl font-semibold text-teal">
                  ₹{listStats.revenue.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Balance pending</p>
                <p className="mt-1 font-display text-xl font-semibold text-signal">
                  ₹{listStats.pending_balance.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">With hotel add-on</p>
                <p className="mt-1 font-display text-xl font-semibold text-violet">
                  {listStats.with_hotel}
                </p>
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
                options={websiteDomains}
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
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canExportBookings ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={exporting || listLoading}
                  onClick={() => setExportOpen(true)}
                >
                  <Download className="size-3.5" />
                  Export CSV
                </Button>
              ) : null}
            </div>
          </div>

          <div className="relative hidden min-h-0 flex-1 md:block">
            <CrmGrid<Booking>
              className="h-full min-h-[28rem]"
              columnDefs={columnDefs}
              fetchPage={fetchGridPage}
              toolbarKey={filterKey}
              storageKey="crm.ag.bookings.v1"
              context={gridActions}
              onGridApi={(api) => {
                gridApiRef.current = api;
              }}
              onError={(error) => {
                toast({
                  variant: "error",
                  title: "Could not load bookings",
                  description: error instanceof Error ? error.message : "Please try again.",
                });
              }}
              onStats={({ total, extra }) => {
                const stats = extra as
                  | {
                      total?: number;
                      revenue?: number;
                      pending_balance?: number;
                      with_hotel?: number;
                    }
                  | undefined;
                if (stats && typeof stats.total === "number") {
                  setListStats({
                    total: stats.total,
                    revenue: stats.revenue ?? 0,
                    pending_balance: stats.pending_balance ?? 0,
                    with_hotel: stats.with_hotel ?? 0,
                  });
                } else {
                  setListStats((prev) => ({ ...prev, total }));
                }
                setListLoading(false);
              }}
              extractExtra={(result) => (result as { stats?: unknown }).stats}
            />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:hidden">
            {listLoading && visible.length === 0 ? (
              <RecordCardsSkeleton count={4} />
            ) : visible.length === 0 ? (
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
                      <p className="font-mono-data text-[11px] text-slate-soft">
                        {b.bookingNo ?? b.id}
                      </p>
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
                      <Button size="sm" variant="outline" onClick={() => setInvoiceBookingId(b.id)}>
                        <Receipt className="size-3.5" /> Invoice
                      </Button>
                    ) : null}
                    {canEditBooking ? (
                      <Button size="sm" variant="outline" onClick={() => setEditingBookingId(b.id)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    ) : null}
                    {canDeleteBooking ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-signal"
                        onClick={() => setDeleteTarget(b)}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    ) : null}
                  </div>
                </RecordCard>
              ))
            )}
          </div>
          <PagePagination
            page={listPagination.page}
            totalPages={listPagination.totalPages}
            total={listPagination.total}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={setPage}
            className="shrink-0 md:hidden"
          />
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
          const current = findBooking(bookingId);
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
            void reloadBookings();
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

      <BookingInvoiceDrawer
        booking={invoiceBooking}
        open={!!invoiceBookingId}
        onOpenChange={(v) => !v && setInvoiceBookingId(null)}
      />

      <BookingsExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        initialFilters={exportInitialFilters}
        statusOptions={statuses}
        websiteOptions={websiteDomains}
        driverOptions={driverNames}
        exporting={exporting}
        onExport={async (exportQuery) => {
          setExporting(true);
          try {
            return await downloadBookingsCsv(exportQuery);
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
