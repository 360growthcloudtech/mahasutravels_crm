"use client";

import * as React from "react";
import {
  Phone,
  Search,
  UserRound,
  X,
  Filter,
  ChevronDown,
} from "lucide-react";
import type { GridApi } from "ag-grid-community";
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
import { useHasPermission } from "@/lib/use-has-permission";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import {
  Booking,
  Driver,
  bookingRoute,
  makeLeadHistoryEvent,
} from "@/lib/data";
import { assignedVehicleLabel, bookingDrivers, findDriverByAssignment } from "@/lib/booking-utils";
import { DriverStatusBadge } from "@/components/crm/driver-status-badge";
import { formatDisplayDate } from "@/components/crm/date-picker";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import {
  RecordCardsSkeleton,
  StatCardsSkeleton,
} from "@/components/crm/skeletons";
import { PagePagination } from "@/components/crm/list-pagination";
import { CrmGrid, type GridPageRequest } from "@/components/crm/grid/crm-grid";
import {
  AssignDriverMenu,
  buildAssignmentsColumnDefs,
  type AssignmentsGridActions,
} from "@/components/crm/grid/assignments-grid-columns";
import { bookingFromApi, fetchBookingsPage } from "@/lib/bookings-api";

const ASSIGNMENTS_PAGE_SIZE = 25;

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

function findDriver(drivers: Driver[], name: string, vehicle?: string) {
  return findDriverByAssignment(drivers, name, vehicle);
}

export default function AssignmentsPage() {
  const {
    state,
    bookingsLoading,
    driversLoading,
    refreshBookings,
    refreshDrivers,
    updateBooking,
  } = useData();
  const { toast } = useToast();
  const canAssignDriver = useHasPermission("booking.and.drivers.assign");
  const pageLoading = bookingsLoading || driversLoading;

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [driverFilter, setDriverFilter] = React.useState<string[]>([]);
  const [view, setView] = React.useState<"table" | "by-driver">("table");
  const [page, setPage] = React.useState(1);
  const [pageBookings, setPageBookings] = React.useState<Booking[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listPagination, setListPagination] = React.useState({
    page: 1,
    pageSize: ASSIGNMENTS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const gridApiRef = React.useRef<GridApi<Booking> | null>(null);
  const [hasColumnFilters, setHasColumnFilters] = React.useState(false);
  const columnDefs = React.useMemo(() => buildAssignmentsColumnDefs(), []);
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

  const filterKey = `${debouncedQuery}|${driverFilter.join(",")}`;

  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const toolbarFilters = React.useMemo(
    () => ({
      search: debouncedQuery || undefined,
      driver: driverFilter.length ? driverFilter : undefined,
    }),
    [debouncedQuery, driverFilter]
  );

  const refreshAssignments = React.useCallback(async () => {
    gridApiRef.current?.refreshInfiniteCache();
    await Promise.all([refreshBookings(), refreshDrivers()]);
  }, [refreshBookings, refreshDrivers]);

  const loadBookingsPage = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchBookingsPage({
        ...toolbarFilters,
        page,
        pageSize: ASSIGNMENTS_PAGE_SIZE,
      });
      setPageBookings(data.bookings.map(bookingFromApi));
      setListPagination(data.pagination);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load assignments",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setListLoading(false);
    }
  }, [toolbarFilters, page, toast]);

  React.useEffect(() => {
    if (isDesktop && view === "table") return;
    if (view === "by-driver") return;
    void loadBookingsPage();
  }, [loadBookingsPage, isDesktop, view]);

  React.useEffect(() => {
    if (listPagination.totalPages > 0 && page > listPagination.totalPages) {
      setPage(listPagination.totalPages);
    }
  }, [listPagination.totalPages, page]);

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
      };
    },
    [toolbarFilters]
  );

  const activeBookings = state.bookings.filter(
    (b) => b.status !== "Cancelled" && b.status !== "Refunded"
  );
  const assigned = activeBookings.filter((b) => bookingDrivers(b).length > 0);
  const unassigned = activeBookings.filter((b) => bookingDrivers(b).length === 0);

  const driverNames = React.useMemo(
    () =>
      [
        ...new Set(
          state.bookings.flatMap((b) => bookingDrivers(b).map((d) => d.driver)).filter(Boolean)
        ),
      ].sort() as string[],
    [state.bookings]
  );

  const assignableDrivers = state.drivers.filter((d) => d.status === "Approved");

  const visibleForByDriver = state.bookings.filter((b) => {
    const drivers = bookingDrivers(b);
    const q = debouncedQuery.toLowerCase();
    if (q) {
      const hay = [
        b.customer,
        b.id,
        b.bookingNo ?? "",
        b.tourPackage,
        bookingRoute(b),
        b.phone ?? "",
        ...drivers.map((d) => d.driver),
        ...drivers.map((d) => d.vehicle),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (driverFilter.length > 0) {
      if (!drivers.some((d) => driverFilter.includes(d.driver))) return false;
    }
    return true;
  });

  const byDriver = React.useMemo(() => {
    const map = new Map<string, { driver?: Driver; bookings: Booking[] }>();
    for (const b of visibleForByDriver) {
      const drivers = bookingDrivers(b);
      if (drivers.length === 0) {
        const entry = map.get("Unassigned") ?? { driver: undefined, bookings: [] };
        entry.bookings.push(b);
        map.set("Unassigned", entry);
        continue;
      }
      for (const assignment of drivers) {
        const key = assignment.driver.trim() || "Unassigned";
        const entry = map.get(key) ?? {
          driver:
            key === "Unassigned"
              ? undefined
              : findDriver(state.drivers, key, assignment.vehicle),
          bookings: [],
        };
        if (!entry.bookings.some((item) => item.id === b.id)) {
          entry.bookings.push(b);
        }
        map.set(key, entry);
      }
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [visibleForByDriver, state.drivers]);

  const driversWithWorkSet = new Set(
    assigned.flatMap((b) => bookingDrivers(b).map((d) => d.driver)).filter(Boolean)
  );
  const driversWithWork = driversWithWorkSet.size;
  const freeApproved = assignableDrivers.filter((d) => !driversWithWorkSet.has(d.name)).length;

  async function assignDriver(booking: Booking, driver: Driver) {
    const vehicleNumber = driver.vehicle?.trim() ?? "";
    const drivers = [{ driver: driver.name, vehicle: vehicleNumber }];

    try {
      await updateBooking(booking.id, {
        drivers,
        driver: driver.name,
        vehicle: vehicleNumber,
        history: [
          ...(booking.history ?? []),
          makeLeadHistoryEvent("assigned", "Driver assigned", {
            detail: vehicleNumber ? `${driver.name} · ${vehicleNumber}` : driver.name,
          }),
        ],
      });
      toast({
        variant: "success",
        title: "Driver assigned",
        description: `${driver.name} → ${booking.customer}`,
      });
      gridApiRef.current?.refreshInfiniteCache();
      if (!isDesktop || view !== "table") await loadBookingsPage();
      await refreshBookings();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not assign driver",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  const gridActions = React.useMemo<AssignmentsGridActions>(
    () => ({
      drivers: state.drivers,
      assignableDrivers,
      canAssignDriver,
      onAssign: (booking, driver) => void assignDriver(booking, driver),
    }),
    [state.drivers, assignableDrivers, canAssignDriver]
  );

  const hasFilters = query.trim().length > 0 || driverFilter.length > 0 || hasColumnFilters;

  const rangeStart =
    listPagination.total === 0 ? 0 : (listPagination.page - 1) * listPagination.pageSize + 1;
  const rangeEnd = Math.min(
    listPagination.page * listPagination.pageSize,
    listPagination.total
  );

  return (
    <>
      <Topbar
        title="Booking & Drivers"
        action={
          <TableRefreshButton
            onRefresh={() => void refreshAssignments()}
            loading={pageLoading || listLoading}
          />
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col">
        {pageLoading ? (
          <StatCardsSkeleton />
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active with driver</p>
                <p className="mt-1 font-display text-xl font-semibold text-teal">
                  {assigned.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Unassigned</p>
                <p className="mt-1 font-display text-xl font-semibold text-signal">
                  {unassigned.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Drivers on trips</p>
                <p className="mt-1 font-display text-xl font-semibold">{driversWithWork}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active & free</p>
                <p className="mt-1 font-display text-xl font-semibold text-marigold-ink">
                  {freeApproved}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mb-4 border-dashed">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-marigold-soft text-marigold-ink">
              <UserRound className="size-4.5" />
            </div>
            <p className="text-xs text-muted-foreground">
              See which driver is assigned to each booking. Reassign from the table or review trips
              grouped by driver. Cancelled and refunded bookings stay listed but are excluded from
              active counts.
            </p>
          </CardContent>
        </Card>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-soft" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search booking, guest, driver…"
              className="h-8 pl-8"
              type="search"
              name="assignments-list-search"
              autoComplete="off"
            />
          </div>
          <MultiFilter
            label="Driver"
            options={driverNames}
            selected={driverFilter}
            onChange={setDriverFilter}
          />
          <div className="flex rounded-md border border-border bg-card p-0.5">
            <Button
              type="button"
              size="sm"
              variant={view === "table" ? "secondary" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setView("table")}
            >
              By booking
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "by-driver" ? "secondary" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setView("by-driver")}
            >
              By driver
            </Button>
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-slate"
              onClick={() => {
                setQuery("");
                setDriverFilter([]);
                gridApiRef.current?.setFilterModel(null);
                setHasColumnFilters(false);
              }}
            >
              <X className="size-3.5" /> Clear
            </Button>
          )}
          <p className="ml-auto text-xs text-slate-soft">
            {view === "table" ? listPagination.total : visibleForByDriver.length} of{" "}
            {state.bookings.length}
          </p>
        </div>

        {view === "table" ? (
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative hidden min-h-0 flex-1 md:block">
              <CrmGrid<Booking>
                className="h-full min-h-[28rem]"
                columnDefs={columnDefs}
                fetchPage={fetchGridPage}
                toolbarKey={filterKey}
                storageKey="crm.ag.assignments.v1"
                context={gridActions}
                onGridApi={(api) => {
                  gridApiRef.current = api;
                }}
                onColumnFiltersChange={setHasColumnFilters}
                onError={(error) => {
                  toast({
                    variant: "error",
                    title: "Could not load assignments",
                    description: error instanceof Error ? error.message : "Please try again.",
                  });
                }}
                onStats={({ total }) => {
                  setListPagination((prev) => ({
                    ...prev,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / prev.pageSize) || 1),
                  }));
                  setListLoading(false);
                }}
              />
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:hidden">
              {listLoading && pageBookings.length === 0 ? (
                <RecordCardsSkeleton count={4} />
              ) : pageBookings.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-soft">
                  No booking–driver rows match your filters.
                </p>
              ) : (
                pageBookings.map((b) => {
                  const assignments = bookingDrivers(b);
                  return (
                    <RecordCard key={b.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-base font-semibold break-words text-ink-text">
                            {b.customer}
                          </p>
                          <p className="font-mono-data text-[11px] text-slate-soft">
                            {b.bookingNo ?? b.id}
                          </p>
                        </div>
                        <StatusBadge status={b.status} />
                      </div>
                      <InfoGrid>
                        <InfoItem label="Travel">
                          {formatDisplayDate(b.travelDate)}
                          {b.returnDate ? ` → ${formatDisplayDate(b.returnDate)}` : ""} · {b.days}d
                        </InfoItem>
                        <InfoItem label="Package">{b.tourPackage}</InfoItem>
                        <InfoItem label="Route" className="sm:col-span-2">
                          {bookingRoute(b)}
                        </InfoItem>
                        <InfoItem label="Drivers" className="sm:col-span-2">
                          {assignments.length
                            ? assignments
                                .map(
                                  (a, i) =>
                                    `${a.driver}${
                                      assignedVehicleLabel(a, state.drivers) !== "—"
                                        ? ` · ${assignedVehicleLabel(a, state.drivers)}`
                                        : ""
                                    }${i === 0 && assignments.length > 1 ? " (primary)" : ""}`
                                )
                                .join(", ")
                            : "Unassigned"}
                        </InfoItem>
                      </InfoGrid>
                      {canAssignDriver ? (
                        <AssignDriverMenu
                          booking={b}
                          assignableDrivers={assignableDrivers}
                          onAssign={(d) => void assignDriver(b, d)}
                        />
                      ) : null}
                    </RecordCard>
                  );
                })
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
        ) : pageLoading ? (
          <RecordCardsSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {byDriver.map(([name, group]) => (
              <Card key={name}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                        {name === "Unassigned"
                          ? "?"
                          : name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink-text">{name}</p>
                        {group.driver ? (
                          <p className="flex items-center gap-2 text-xs text-slate">
                            <span className="font-mono-data">{group.driver.vehicle}</span>
                            <DriverStatusBadge status={group.driver.status} />
                          </p>
                        ) : name !== "Unassigned" ? (
                          <p className="text-xs text-signal">Driver profile not found</p>
                        ) : (
                          <p className="text-xs text-slate-soft">Needs driver assignment</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">{group.bookings.length} trip(s)</Badge>
                  </div>

                  {group.driver?.phone ? (
                    <p className="mb-3 flex items-center gap-1.5 text-xs text-slate">
                      <Phone className="size-3.5 text-slate-soft" />
                      <span className="font-mono-data">{group.driver.phone}</span>
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    {group.bookings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-md border border-border-soft bg-wash px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-text">
                            {b.customer}
                          </p>
                          <p className="font-mono-data text-[11px] text-slate-soft">
                            {b.bookingNo ?? b.id} · {formatDisplayDate(b.travelDate)}
                            {b.returnDate ? ` → ${formatDisplayDate(b.returnDate)}` : ""}
                          </p>
                          <p className="truncate text-[11px] text-slate">{bookingRoute(b)}</p>
                        </div>
                        {canAssignDriver && (name === "Unassigned" || !group.driver) ? (
                          <div className="mt-2">
                            <AssignDriverMenu
                              booking={b}
                              assignableDrivers={assignableDrivers}
                              onAssign={(d) => void assignDriver(b, d)}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {byDriver.length === 0 && (
              <Card className="border-dashed xl:col-span-2">
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No assignments to show.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </>
  );
}
