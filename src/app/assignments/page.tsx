"use client";

import * as React from "react";
import {
  Car,
  ChevronDown,
  Filter,
  Phone,
  Search,
  UserRound,
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
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import {
  Booking,
  Driver,
  bookingRoute,
  makeLeadHistoryEvent,
} from "@/lib/data";
import { formatDisplayDate } from "@/components/crm/date-picker";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";

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
  return (
    drivers.find((d) => d.name === name && (!vehicle || d.vehicle === vehicle)) ??
    drivers.find((d) => d.name === name)
  );
}

export default function AssignmentsPage() {
  const { state, updateBooking } = useData();
  const { toast } = useToast();

  const [query, setQuery] = React.useState("");
  const [driverFilter, setDriverFilter] = React.useState<string[]>([]);
  const [view, setView] = React.useState<"table" | "by-driver">("table");

  const activeBookings = state.bookings.filter(
    (b) => b.status !== "Cancelled" && b.status !== "Refunded"
  );
  const assigned = activeBookings.filter((b) => b.driver?.trim());
  const unassigned = activeBookings.filter((b) => !b.driver?.trim());

  const driverNames = React.useMemo(
    () =>
      [...new Set(state.bookings.map((b) => b.driver).filter(Boolean))].sort() as string[],
    [state.bookings]
  );

  const assignableDrivers = state.drivers.filter((d) => d.status === "Approved");

  const visible = state.bookings.filter((b) => {
    const q = query.trim().toLowerCase();
    if (q) {
      const hay = [
        b.customer,
        b.id,
        b.driver,
        b.vehicle,
        b.tourPackage,
        bookingRoute(b),
        b.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (driverFilter.length > 0) {
      if (!b.driver || !driverFilter.includes(b.driver)) return false;
    }
    return true;
  });

  const byDriver = React.useMemo(() => {
    const map = new Map<string, { driver?: Driver; bookings: Booking[] }>();
    for (const b of visible) {
      const key = b.driver?.trim() || "Unassigned";
      const entry = map.get(key) ?? {
        driver: key === "Unassigned" ? undefined : findDriver(state.drivers, key, b.vehicle),
        bookings: [],
      };
      entry.bookings.push(b);
      map.set(key, entry);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [visible, state.drivers]);

  const driversWithWorkSet = new Set(assigned.map((b) => b.driver).filter(Boolean));
  const driversWithWork = driversWithWorkSet.size;
  const freeApproved = assignableDrivers.filter((d) => !driversWithWorkSet.has(d.name)).length;

  function assignDriver(booking: Booking, driver: Driver) {
    updateBooking(booking.id, {
      driver: driver.name,
      vehicle: driver.vehicle,
      history: [
        ...(booking.history ?? []),
        makeLeadHistoryEvent("assigned", "Driver assigned", {
          detail: `${driver.name} · ${driver.vehicle}`,
        }),
      ],
    });
    toast({
      variant: "success",
      title: "Driver assigned",
      description: `${driver.name} linked to ${booking.id}.`,
    });
  }

  const hasFilters = query.trim().length > 0 || driverFilter.length > 0;

  return (
    <Shell>
      <Topbar
        title="Booking & Drivers"
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col">
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
              <p className="text-xs text-muted-foreground">Approved & free</p>
              <p className="mt-1 font-display text-xl font-semibold text-marigold-ink">
                {freeApproved}
              </p>
            </CardContent>
          </Card>
        </div>

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
              }}
            >
              <X className="size-3.5" /> Clear
            </Button>
          )}
          <p className="ml-auto text-xs text-slate-soft">
            {visible.length} of {state.bookings.length}
          </p>
        </div>

        {view === "table" ? (
          <Card className="min-h-0 flex-1 overflow-hidden">
            <div className="hidden h-full overflow-auto md:block">
              <Table containerClassName="min-w-[56rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-20 bg-card">Booking</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Travel</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Package / Route</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Driver</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Vehicle</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card w-[9rem]">Assign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-soft">
                        No booking–driver rows match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map((b) => {
                      const driver = findDriver(state.drivers, b.driver, b.vehicle);
                      return (
                        <TableRow key={b.id} className="group">
                          <TableCell>
                            <p className="text-sm font-medium text-ink-text">{b.customer}</p>
                            <p className="font-mono-data text-[11px] text-slate-soft">{b.id}</p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDisplayDate(b.travelDate)}
                            {b.returnDate ? ` → ${formatDisplayDate(b.returnDate)}` : ""}
                            <p className="text-[11px] text-slate-soft">{b.days}d</p>
                          </TableCell>
                          <TableCell className="min-w-0">
                            <p className="truncate text-sm text-ink-text">{b.tourPackage}</p>
                            <p className="truncate text-[11px] text-slate-soft">
                              {bookingRoute(b)}
                            </p>
                          </TableCell>
                          <TableCell>
                            {b.driver ? (
                              <div>
                                <p className="text-sm font-medium text-ink-text">{b.driver}</p>
                                {driver ? (
                                  <p className="font-mono-data text-[11px] text-slate-soft">
                                    {driver.id} · {driver.status}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-signal">Not in driver master</p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline">Unassigned</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono-data text-sm">
                            {b.vehicle || "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-full">
                                  {b.driver ? "Reassign" : "Assign"}
                                  <ChevronDown className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[14rem]">
                                <DropdownMenuLabel>Approved drivers</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {assignableDrivers.length === 0 ? (
                                  <DropdownMenuItem disabled>No approved drivers</DropdownMenuItem>
                                ) : (
                                  assignableDrivers.map((d) => (
                                    <DropdownMenuItem
                                      key={d.id}
                                      disabled={d.name === b.driver && d.vehicle === b.vehicle}
                                      onSelect={() => assignDriver(b, d)}
                                    >
                                      <Car className="size-3.5" />
                                      <span className="min-w-0">
                                        <span className="block text-sm">{d.name}</span>
                                        <span className="block font-mono-data text-[10px] text-slate-soft">
                                          {d.vehicle} · {d.vehicleType}
                                        </span>
                                      </span>
                                    </DropdownMenuItem>
                                  ))
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:hidden">
              {visible.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-soft">
                  No booking–driver rows match your filters.
                </p>
              ) : (
                visible.map((b) => {
                  const driver = findDriver(state.drivers, b.driver, b.vehicle);
                  return (
                    <RecordCard key={b.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-base font-semibold break-words text-ink-text">{b.customer}</p>
                          <p className="font-mono-data text-[11px] text-slate-soft">{b.id}</p>
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
                        <InfoItem label="Driver">
                          {b.driver || "Unassigned"}
                          {driver ? ` · ${driver.status}` : b.driver ? " · not in master" : ""}
                        </InfoItem>
                        <InfoItem label="Vehicle">{b.vehicle || "—"}</InfoItem>
                      </InfoGrid>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            {b.driver ? "Reassign driver" : "Assign driver"}
                            <ChevronDown className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[14rem]">
                          <DropdownMenuLabel>Approved drivers</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {assignableDrivers.length === 0 ? (
                            <DropdownMenuItem disabled>No approved drivers</DropdownMenuItem>
                          ) : (
                            assignableDrivers.map((d) => (
                              <DropdownMenuItem
                                key={d.id}
                                disabled={d.name === b.driver && d.vehicle === b.vehicle}
                                onSelect={() => assignDriver(b, d)}
                              >
                                <Car className="size-3.5" />
                                <span className="min-w-0">
                                  <span className="block text-sm">{d.name}</span>
                                  <span className="block font-mono-data text-[10px] text-slate-soft">
                                    {d.vehicle} · {d.vehicleType}
                                  </span>
                                </span>
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </RecordCard>
                  );
                })
              )}
            </div>
          </Card>
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
                            <StatusBadge status={group.driver.status} />
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
                            {b.id} · {formatDisplayDate(b.travelDate)}
                            {b.returnDate ? ` → ${formatDisplayDate(b.returnDate)}` : ""}
                          </p>
                          <p className="truncate text-[11px] text-slate">{bookingRoute(b)}</p>
                        </div>
                        {name === "Unassigned" || !group.driver ? (
                          <div className="mt-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7">
                                  Assign driver
                                  <ChevronDown className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {assignableDrivers.map((d) => (
                                  <DropdownMenuItem
                                    key={d.id}
                                    onSelect={() => assignDriver(b, d)}
                                  >
                                    {d.name} · {d.vehicle}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
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
    </Shell>
  );
}
