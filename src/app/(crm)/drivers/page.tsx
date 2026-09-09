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
  MoreHorizontal,
} from "lucide-react";
import type { GridApi } from "ag-grid-community";
import { Topbar } from "@/components/crm/topbar";
import { TableRefreshButton } from "@/components/crm/table-refresh-button";
import { useHasPermission } from "@/lib/use-has-permission";
import { Card, CardContent } from "@/components/ui/card";
import { DriverStatusBadge } from "@/components/crm/driver-status-badge";
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
import { DriverFormDialog, DriverFormState } from "@/components/crm/driver-form-dialog";
import { VehicleTypesManager } from "@/components/crm/vehicle-types-manager";
import { CrmGrid, type GridPageRequest } from "@/components/crm/grid/crm-grid";
import {
  buildDriversColumnDefs,
  type DriversGridActions,
} from "@/components/crm/grid/drivers-grid-columns";
import {
  RecordCardsSkeleton,
  StatCardsSkeleton,
} from "@/components/crm/skeletons";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { PagePagination } from "@/components/crm/list-pagination";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Driver } from "@/lib/data";
import { driverFromApi, fetchDriversPage } from "@/lib/drivers-api";
import {
  DRIVER_STATUS_FILTER_GROUPS,
  formatDriverStatusLabel,
  isDriverActiveStatus,
} from "@/lib/driver-utils";

type DriverStatusFilter = (typeof DRIVER_STATUS_FILTER_GROUPS)[number]["label"];

const DRIVERS_PAGE_SIZE = 25;

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

function expandStatusFilter(labels: DriverStatusFilter[]): string[] | undefined {
  if (!labels.length) return undefined;
  const statuses = labels.flatMap(
    (label) =>
      DRIVER_STATUS_FILTER_GROUPS.find((g) => g.label === label)?.statuses ?? []
  );
  return statuses.length ? [...statuses] : undefined;
}

function DriverCard({
  d,
  statusBusy,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  d: Driver;
  statusBusy?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
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
            <DriverStatusBadge status={d.status} />
            {canEdit || canDelete ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="size-7" disabled={statusBusy}>
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit ? (
                    <DropdownMenuItem onSelect={() => onEdit()}>
                      <Pencil className="size-3.5" /> Edit profile
                    </DropdownMenuItem>
                  ) : null}
                  {canEdit && canDelete ? <DropdownMenuSeparator /> : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      className="text-signal focus:bg-signal-soft"
                      onSelect={(e) => {
                        e.preventDefault();
                        onDelete();
                      }}
                    >
                      <Trash2 className="size-3.5" /> Remove driver
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
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

        {canEdit || canDelete ? (
          <div className="grid grid-cols-2 gap-2 border-t border-border-soft pt-3">
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={statusBusy}
                onClick={onEdit}
              >
                <Pencil className="size-3.5" /> Edit
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={statusBusy}
                onClick={() => void onToggleStatus()}
              >
                {statusBusy
                  ? "Updating…"
                  : isDriverActiveStatus(d.status)
                    ? "Deactivate"
                    : "Activate"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function DriversPage() {
  const { state, driversLoading, refreshDrivers, addDriver, updateDriver, deleteDriver } =
    useData();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = React.useState<Driver | null>(null);
  const canCreateDriver = useHasPermission("drivers.and.vehicles.create");
  const canEditDriver = useHasPermission("drivers.and.vehicles.edit");
  const canDeleteDriver = useHasPermission("drivers.and.vehicles.delete");
  const [editingDriverId, setEditingDriverId] = React.useState<string | null>(null);
  const [vehicleTypesOpen, setVehicleTypesOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [statusBusyId, setStatusBusyId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<DriverStatusFilter[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageDrivers, setPageDrivers] = React.useState<Driver[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listPagination, setListPagination] = React.useState({
    page: 1,
    pageSize: DRIVERS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const gridApiRef = React.useRef<GridApi<Driver> | null>(null);
  const columnDefs = React.useMemo(() => buildDriversColumnDefs(), []);
  const [isDesktop, setIsDesktop] = React.useState(false);

  const { drivers } = state;
  const editingDriver =
    (editingDriverId ? pageDrivers.find((d) => d.id === editingDriverId) : null) ??
    (editingDriverId ? drivers.find((d) => d.id === editingDriverId) ?? null : null);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filterKey = `${debouncedSearch}|${statusFilter.join(",")}`;

  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const toolbarFilters = React.useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: expandStatusFilter(statusFilter),
    }),
    [debouncedSearch, statusFilter]
  );

  const loadDriversPage = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchDriversPage({
        ...toolbarFilters,
        page,
        pageSize: DRIVERS_PAGE_SIZE,
      });
      setPageDrivers(data.drivers.map(driverFromApi));
      setListPagination(data.pagination);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load drivers",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setListLoading(false);
    }
  }, [toolbarFilters, page, toast]);

  React.useEffect(() => {
    if (isDesktop) return;
    void loadDriversPage();
  }, [loadDriversPage, isDesktop]);

  React.useEffect(() => {
    if (listPagination.totalPages > 0 && page > listPagination.totalPages) {
      setPage(listPagination.totalPages);
    }
  }, [listPagination.totalPages, page]);

  async function reloadDrivers() {
    gridApiRef.current?.refreshInfiniteCache();
    if (!isDesktop) await loadDriversPage();
    await refreshDrivers();
  }

  const fetchGridPage = React.useCallback(
    async (request: GridPageRequest) => {
      const data = await fetchDriversPage({
        ...toolbarFilters,
        page: request.page,
        pageSize: request.pageSize,
        sortBy: request.sortBy,
        sortDir: request.sortDir,
        colFilters: request.colFilters,
      });
      return {
        rows: data.drivers.map(driverFromApi),
        total: data.pagination.total,
      };
    },
    [toolbarFilters]
  );

  async function handleCreate(data: DriverFormState) {
    try {
      await addDriver(data);
      toast({
        variant: "success",
        title: "Driver added",
        description: `${data.name} joined the fleet.`,
      });
      void reloadDrivers();
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
      void reloadDrivers();
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
    const next = isDriverActiveStatus(d.status) ? "Deactivated" : "Approved";
    setStatusBusyId(d.id);
    try {
      await updateDriver(d.id, { status: next });
      toast({
        variant: "info",
        title: "Status updated",
        description: `${d.name} marked as ${formatDriverStatusLabel(next)}.`,
      });
      void reloadDrivers();
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
      void reloadDrivers();
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

  const gridActions = React.useMemo<DriversGridActions>(
    () => ({
      canEditDriver,
      canDeleteDriver,
      statusBusyId,
      onEdit: (d) => setEditingDriverId(d.id),
      onToggleStatus: (d) => void handleToggleStatus(d),
      onDelete: (d) => setDeleteTarget(d),
    }),
    [canEditDriver, canDeleteDriver, statusBusyId]
  );

  const rangeStart =
    listPagination.total === 0 ? 0 : (listPagination.page - 1) * listPagination.pageSize + 1;
  const rangeEnd = Math.min(
    listPagination.page * listPagination.pageSize,
    listPagination.total
  );

  return (
    <>
      <Topbar
        title="Drivers & Vehicles"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TableRefreshButton onRefresh={() => void reloadDrivers()} loading={driversLoading || listLoading} />
            {canCreateDriver || canEditDriver || canDeleteDriver ? (
              <Button variant="outline" onClick={() => setVehicleTypesOpen(true)}>
                <Car className="size-4" /> Vehicle types
              </Button>
            ) : null}
            {canCreateDriver ? (
              <DriverFormDialog
                trigger={
                  <Button variant="marigold">
                    <Plus className="size-4" /> Add Driver
                  </Button>
                }
                onSubmit={handleCreate}
              />
            ) : null}
          </div>
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col">
        {driversLoading ? (
          <StatCardsSkeleton />
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="mt-1 font-display text-xl font-semibold text-teal">
                  {drivers.filter((d) => isDriverActiveStatus(d.status)).length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Inactive</p>
                <p className="mt-1 font-display text-xl font-semibold text-slate-soft">
                  {drivers.filter((d) => !isDriverActiveStatus(d.status)).length}
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
        )}

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
                {DRIVER_STATUS_FILTER_GROUPS.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.label}
                    checked={statusFilter.includes(option.label)}
                    onCheckedChange={() => setStatusFilter(toggleValue(statusFilter, option.label))}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {option.label}
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
              {listPagination.total} of {drivers.length}
            </p>
          </div>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative hidden min-h-0 flex-1 md:block">
            <CrmGrid<Driver>
              className="h-full min-h-[28rem]"
              columnDefs={columnDefs}
              fetchPage={fetchGridPage}
              toolbarKey={filterKey}
              storageKey="crm.ag.drivers.v1"
              context={gridActions}
              onGridApi={(api) => {
                gridApiRef.current = api;
              }}
              onError={(error) => {
                toast({
                  variant: "error",
                  title: "Could not load drivers",
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
            {listLoading && pageDrivers.length === 0 ? (
              <RecordCardsSkeleton count={4} />
            ) : pageDrivers.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-soft">
                No drivers match your filters. Add a driver to get started.
              </p>
            ) : (
              pageDrivers.map((d) => (
                <DriverCard
                  key={d.id}
                  d={d}
                  statusBusy={statusBusyId === d.id}
                  canEdit={canEditDriver}
                  canDelete={canDeleteDriver}
                  onEdit={() => setEditingDriverId(d.id)}
                  onToggleStatus={() => handleToggleStatus(d)}
                  onDelete={() => setDeleteTarget(d)}
                />
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

      <DriverFormDialog
        driver={editingDriver ?? undefined}
        open={!!editingDriver}
        onOpenChange={(open) => {
          if (!open) setEditingDriverId(null);
        }}
        onSubmit={async (data) => {
          if (!editingDriver) return;
          await handleEdit(editingDriver, data);
          setEditingDriverId(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && !deleting && setDeleteTarget(null)}
        title="Remove this driver?"
        description={`${deleteTarget?.name ?? ""} (${deleteTarget?.driverNo ?? ""}) will be removed from your active fleet. Existing bookings will keep the driver's name on record.`}
        confirming={deleting}
        closeOnConfirm={false}
        onConfirm={() => handleDelete()}
      />

      <VehicleTypesManager
        open={vehicleTypesOpen}
        onOpenChange={setVehicleTypesOpen}
        canCreate={canCreateDriver}
        canEdit={canEditDriver}
        canDelete={canDeleteDriver}
      />
    </>
  );
}
