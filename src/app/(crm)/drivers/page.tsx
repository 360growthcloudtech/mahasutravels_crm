"use client";

import * as React from "react";
import {
  Star,
  Phone,
  Car,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  Archive,
} from "lucide-react";
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
import { DriverFormDialog, DriverFormState } from "@/components/crm/driver-form-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import {
  InfiniteScrollSentinel,
  PagePagination,
} from "@/components/crm/list-pagination";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { useListPagination } from "@/lib/use-list-pagination";
import { Driver } from "@/lib/data";

const statuses: Driver["status"][] = ["Approved", "Rejected", "Deactivated"];

const stickyActionHead =
  "sticky right-0 top-0 z-30 min-w-[9rem] whitespace-nowrap border-l border-border-soft bg-card";
const stickyActionCell =
  "relative sticky right-0 z-20 min-w-[9rem] border-l border-border-soft bg-card before:absolute before:inset-0 before:-z-10 before:bg-card before:content-[''] group-hover:bg-secondary group-hover:before:bg-secondary";

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function driverInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

function DriverCard({
  d,
  statusBusy,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  d: Driver;
  statusBusy?: boolean;
  onEdit: (data: DriverFormState) => Promise<void>;
  onToggleStatus: () => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
              {driverInitials(d.name)}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] leading-snug font-semibold break-words text-ink-text">
                {d.name}
              </p>
              <p className="mt-0.5 font-mono-data text-[11px] text-slate-soft">{d.driverNo}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <StatusBadge status={d.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7" disabled={statusBusy}>
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DriverFormDialog
                  driver={d}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil className="size-3.5" /> Edit profile
                    </DropdownMenuItem>
                  }
                  onSubmit={onEdit}
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-signal focus:bg-signal-soft"
                  onSelect={(e) => {
                    e.preventDefault();
                    onDelete();
                  }}
                >
                  <Trash2 className="size-3.5" /> Remove driver
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate">
          <div className="flex items-start gap-2">
            <Car className="mt-0.5 size-3.5 shrink-0 text-slate-soft" />
            <p className="min-w-0 break-words">
              {d.vehicleType} · <span className="font-mono-data">{d.vehicle}</span>
              {d.vehicleCapacity ? (
                <span className="text-slate-soft"> · {d.vehicleCapacity} seater</span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 shrink-0 text-slate-soft" />
            <span className="font-mono-data">{d.phone}</span>
          </div>
          {d.address ? (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-soft" />
              <span className="min-w-0 break-words">{d.address}</span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {d.documentsVerified ? (
              <ShieldCheck className="size-3.5 shrink-0 text-teal" />
            ) : (
              <ShieldAlert className="size-3.5 shrink-0 text-signal" />
            )}
            <span>{d.documentsVerified ? "Documents verified" : "Documents pending"}</span>
            {d.insuranceExpiry ? (
              <span className="text-slate-soft">· insurance to {d.insuranceExpiry}</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-ink-text">
            <Star className="size-3.5 fill-marigold text-marigold" />
            {d.rating}
            <span className="text-slate-soft">· {d.trips} trips</span>
          </div>
          {d.vendor ? <Badge variant="violet">Vendor</Badge> : null}
        </div>

        {d.notes ? (
          <p className="rounded-md bg-secondary/60 p-2 text-[11px] leading-relaxed text-slate">
            {d.notes}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 border-t border-border-soft pt-3">
          <DriverFormDialog
            driver={d}
            trigger={
              <Button variant="outline" size="sm" className="w-full" disabled={statusBusy}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            }
            onSubmit={onEdit}
          />
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={statusBusy}
            onClick={() => void onToggleStatus()}
          >
            {statusBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {statusBusy
              ? "Updating…"
              : d.status === "Approved"
                ? "Deactivate"
                : "Approve"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DriversPage() {
  const { state, driversLoading, addDriver, updateDriver, deleteDriver } = useData();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = React.useState<Driver | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [statusBusyId, setStatusBusyId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<Driver["status"][]>([]);

  const { drivers } = state;

  const filtered = drivers.filter((d) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.phone.toLowerCase().includes(q) ||
      d.driverNo.toLowerCase().includes(q) ||
      d.vehicle.toLowerCase().includes(q) ||
      d.vehicleType.toLowerCase().includes(q) ||
      (d.address ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(d.status);
    return matchesSearch && matchesStatus;
  });

  const pagination = useListPagination(filtered, {
    pageSize: 10,
    resetKey: `${search}|${statusFilter.join(",")}`,
  });

  async function handleCreate(data: DriverFormState) {
    try {
      await addDriver(data);
      toast({
        variant: "success",
        title: "Driver added",
        description: `${data.name} joined the fleet.`,
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not add driver",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  async function handleEdit(d: Driver, data: DriverFormState) {
    try {
      await updateDriver(d.id, data);
      toast({
        variant: "success",
        title: "Driver updated",
        description: `${data.name}'s profile was saved.`,
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update driver",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  async function handleToggleStatus(d: Driver) {
    const next = d.status === "Approved" ? "Deactivated" : "Approved";
    setStatusBusyId(d.id);
    try {
      await updateDriver(d.id, { status: next });
      toast({
        variant: "info",
        title: "Status updated",
        description: `${d.name} marked as ${next}.`,
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update status",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setStatusBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDriver(deleteTarget.id);
      toast({
        variant: "info",
        title: "Driver removed",
        description: `${deleteTarget.name} was removed from the fleet.`,
      });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not remove driver",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Topbar
        title="Drivers & Vehicles"
        action={
          <DriverFormDialog
            trigger={
              <Button variant="marigold">
                <Plus className="size-4" /> Add Driver
              </Button>
            }
            onSubmit={handleCreate}
          />
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="mt-1 font-display text-xl font-semibold text-teal">
                {drivers.filter((d) => d.status === "Approved").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">
                {drivers.filter((d) => d.status === "Rejected").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Deactivated</p>
              <p className="mt-1 font-display text-xl font-semibold text-slate-soft">
                {drivers.filter((d) => d.status === "Deactivated").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Docs pending</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">
                {drivers.filter((d) => !d.documentsVerified).length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-border-soft bg-paper px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-soft" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, vehicle, ID…"
                className="h-8 pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal">
                  <Filter className="size-3.5 text-slate-soft" />
                  Status
                  {statusFilter.length > 0 ? (
                    <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1.5">
                      {statusFilter.length}
                    </Badge>
                  ) : (
                    <ChevronDown className="size-3.5 text-slate-soft" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[11rem]">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statuses.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option}
                    checked={statusFilter.includes(option)}
                    onCheckedChange={() => setStatusFilter(toggleValue(statusFilter, option))}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {option}
                  </DropdownMenuCheckboxItem>
                ))}
                {statusFilter.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-slate" onSelect={() => setStatusFilter([])}>
                      Clear status
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="ml-auto text-xs text-slate-soft">
              {filtered.length} of {drivers.length}
            </p>
          </div>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="hidden min-h-0 flex-1 flex-col md:flex">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table containerClassName="min-w-[64rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-20 bg-card">Driver</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Vehicle</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Contact</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Location</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Documents</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Rating</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Status</TableHead>
                    <TableHead className={stickyActionHead}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.desktopItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-soft">
                        {driversLoading
                          ? "Loading drivers…"
                          : "No drivers match your filters. Add a driver to get started."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagination.desktopItems.map((d) => {
                      const statusBusy = statusBusyId === d.id;
                      return (
                        <TableRow key={d.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                                {driverInitials(d.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-ink-text">{d.name}</p>
                                <p className="font-mono-data text-[11px] text-slate-soft">
                                  {d.driverNo}
                                </p>
                                {d.vendor ? (
                                  <Badge variant="violet" className="mt-1">
                                    Vendor
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-ink-text">{d.vehicleType}</p>
                            <p className="font-mono-data text-[11px] text-slate-soft">{d.vehicle}</p>
                            {d.vehicleCapacity ? (
                              <p className="text-[11px] text-slate-soft">{d.vehicleCapacity} seater</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="font-mono-data whitespace-nowrap text-sm">
                            {d.phone}
                          </TableCell>
                          <TableCell className="max-w-[12rem] text-sm text-slate">
                            {d.address || "—"}
                            {d.notes ? (
                              <p className="mt-1 text-[11px] text-slate-soft">{d.notes}</p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-1.5 text-xs">
                              {d.documentsVerified ? (
                                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-teal" />
                              ) : (
                                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-signal" />
                              )}
                              <div>
                                <p className="text-ink-text">
                                  {d.documentsVerified ? "Verified" : "Pending"}
                                </p>
                                {d.insuranceExpiry ? (
                                  <p className="text-slate-soft">Ins. {d.insuranceExpiry}</p>
                                ) : null}
                                {d.pollutionExpiry ? (
                                  <p className="text-slate-soft">PUC {d.pollutionExpiry}</p>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="size-3.5 fill-marigold text-marigold" />
                              {d.rating}
                            </div>
                            <p className="text-[11px] text-slate-soft">{d.trips} trips</p>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={d.status} />
                          </TableCell>
                          <TableCell className={stickyActionCell}>
                            <div className="flex items-center gap-1">
                              <DriverFormDialog
                                driver={d}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    disabled={statusBusy}
                                    aria-label={`Edit ${d.name}`}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                }
                                onSubmit={(data) => handleEdit(d, data)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                disabled={statusBusy}
                                onClick={() => void handleToggleStatus(d)}
                              >
                                {statusBusy ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Archive className="size-3.5" />
                                )}
                                {statusBusy
                                  ? "…"
                                  : d.status === "Approved"
                                    ? "Deactivate"
                                    : "Approve"}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    disabled={statusBusy}
                                  >
                                    <MoreHorizontal className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DriverFormDialog
                                    driver={d}
                                    trigger={
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Pencil className="size-3.5" /> Edit profile
                                      </DropdownMenuItem>
                                    }
                                    onSubmit={(data) => handleEdit(d, data)}
                                  />
                                  <DropdownMenuItem
                                    onSelect={() => void handleToggleStatus(d)}
                                  >
                                    <Archive className="size-3.5" />
                                    {d.status === "Approved" ? "Deactivate" : "Approve"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-signal focus:text-signal"
                                    onSelect={() => setDeleteTarget(d)}
                                  >
                                    <Trash2 className="size-3.5" /> Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <PagePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              rangeStart={pagination.rangeStart}
              rangeEnd={pagination.rangeEnd}
              onPageChange={pagination.setPage}
            />
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {pagination.mobileItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-soft">
                {driversLoading
                  ? "Loading drivers…"
                  : "No drivers match your filters. Add a driver to get started."}
              </p>
            ) : (
              <>
                {pagination.mobileItems.map((d) => (
                  <DriverCard
                    key={d.id}
                    d={d}
                    statusBusy={statusBusyId === d.id}
                    onEdit={(data) => handleEdit(d, data)}
                    onToggleStatus={() => handleToggleStatus(d)}
                    onDelete={() => setDeleteTarget(d)}
                  />
                ))}
                <InfiniteScrollSentinel
                  hasMore={pagination.hasMoreMobile}
                  onLoadMore={pagination.loadMoreMobile}
                  loadedCount={pagination.mobileItems.length}
                  total={pagination.total}
                />
              </>
            )}
          </div>
        </Card>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && !deleting && setDeleteTarget(null)}
        title="Remove this driver?"
        description={`${deleteTarget?.name ?? ""} (${deleteTarget?.driverNo ?? ""}) will be removed from your active fleet. Existing bookings will keep the driver's name on record.`}
        confirming={deleting}
        closeOnConfirm={false}
        onConfirm={() => handleDelete()}
      />
    </>
  );
}
