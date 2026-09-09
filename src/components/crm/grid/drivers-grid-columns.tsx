"use client";

import * as React from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  Archive,
  MoreHorizontal,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { DriverStatusBadge } from "@/components/crm/driver-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Driver } from "@/lib/data";
import { isDriverActiveStatus } from "@/lib/driver-utils";

export type DriversGridActions = {
  canEditDriver: boolean;
  canDeleteDriver: boolean;
  statusBusyId: string | null;
  onEdit: (driver: Driver) => void;
  onToggleStatus: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
};

function driverInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

function DriverCell({ data }: ICellRendererParams<Driver>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
        {driverInitials(data.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-text">{data.name}</p>
        <p className="font-mono-data text-[11px] text-slate-soft">{data.driverNo}</p>
        {data.vendor ? (
          <Badge variant="violet" className="mt-1">
            Vendor
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function VehicleCell({ data }: ICellRendererParams<Driver>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm text-ink-text">{data.vehicleType || "—"}</p>
      <p className="font-mono-data text-[11px] text-slate-soft">{data.vehicle || "—"}</p>
      {data.vehicleCapacity ? (
        <p className="text-[11px] text-slate-soft">{data.vehicleCapacity} seater</p>
      ) : null}
    </div>
  );
}

function LocationCell({ data }: ICellRendererParams<Driver>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm text-slate">{data.address || "—"}</p>
      {data.notes ? (
        <p className="mt-0.5 truncate text-[11px] text-slate-soft">{data.notes}</p>
      ) : null}
    </div>
  );
}

function DocsCell({ data }: ICellRendererParams<Driver>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-start gap-1.5 text-xs">
      {data.documentsVerified ? (
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-teal" />
      ) : (
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-signal" />
      )}
      <div>
        <p className="text-ink-text">{data.documentsVerified ? "Verified" : "Pending"}</p>
        {data.insuranceExpiry ? (
          <p className="text-slate-soft">Ins. {data.insuranceExpiry}</p>
        ) : null}
        {data.pollutionExpiry ? (
          <p className="text-slate-soft">PUC {data.pollutionExpiry}</p>
        ) : null}
      </div>
    </div>
  );
}

function RatingCell({ data }: ICellRendererParams<Driver>) {
  if (!data) return null;
  return (
    <div className="flex h-full flex-col justify-center whitespace-nowrap text-sm">
      <div className="flex items-center gap-1">
        <Star className="size-3.5 fill-marigold text-marigold" />
        {data.rating}
      </div>
      <p className="text-[11px] text-slate-soft">{data.trips} trips</p>
    </div>
  );
}

function StatusCell({ data }: ICellRendererParams<Driver>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center">
      <DriverStatusBadge status={data.status} />
    </div>
  );
}

function ActionsCell({
  data,
  context,
}: ICellRendererParams<Driver, unknown, DriversGridActions>) {
  if (!data || !context) return null;
  if (!context.canEditDriver && !context.canDeleteDriver) return null;
  const statusBusy = context.statusBusyId === data.id;
  return (
    <div className="flex h-full items-center justify-end gap-1">
      {context.canEditDriver ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={statusBusy}
          aria-label={`Edit ${data.name}`}
          onClick={() => context.onEdit(data)}
        >
          <Pencil className="size-3.5" />
        </Button>
      ) : null}
      {context.canEditDriver ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          disabled={statusBusy}
          onClick={() => context.onToggleStatus(data)}
        >
          <Archive className="size-3.5" />
          {statusBusy ? "…" : isDriverActiveStatus(data.status) ? "Deactivate" : "Activate"}
        </Button>
      ) : null}
      {context.canEditDriver || context.canDeleteDriver ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" disabled={statusBusy}>
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {context.canEditDriver ? (
              <>
                <DropdownMenuItem onSelect={() => context.onEdit(data)}>
                  <Pencil className="size-3.5" /> Edit profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => context.onToggleStatus(data)}>
                  <Archive className="size-3.5" />
                  {isDriverActiveStatus(data.status) ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </>
            ) : null}
            {context.canEditDriver && context.canDeleteDriver ? <DropdownMenuSeparator /> : null}
            {context.canDeleteDriver ? (
              <DropdownMenuItem
                className="text-signal focus:text-signal"
                onSelect={() => context.onDelete(data)}
              >
                <Trash2 className="size-3.5" /> Remove
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export function buildDriversColumnDefs(): ColDef<Driver>[] {
  return [
    {
      colId: "name",
      field: "name",
      headerName: "Driver",
      pinned: "left",
      lockVisible: true,
      width: 200,
      filter: "agTextColumnFilter",
      cellRenderer: DriverCell,
    },
    {
      colId: "vehicle_type",
      field: "vehicleType",
      headerName: "Vehicle",
      width: 160,
      filter: "agTextColumnFilter",
      cellRenderer: VehicleCell,
    },
    {
      colId: "phone",
      field: "phone",
      headerName: "Contact",
      width: 140,
      filter: "agTextColumnFilter",
      valueFormatter: (p) => p.value ?? "—",
    },
    {
      colId: "address",
      field: "address",
      headerName: "Location",
      width: 180,
      filter: "agTextColumnFilter",
      cellRenderer: LocationCell,
    },
    {
      colId: "insurance_expiry",
      headerName: "Documents",
      width: 150,
      filter: "agDateColumnFilter",
      cellRenderer: DocsCell,
    },
    {
      colId: "rating",
      field: "rating",
      headerName: "Rating",
      width: 110,
      filter: "agNumberColumnFilter",
      cellRenderer: RatingCell,
    },
    {
      colId: "status",
      field: "status",
      headerName: "Status",
      width: 130,
      filter: "agTextColumnFilter",
      cellRenderer: StatusCell,
    },
    {
      colId: "actions",
      headerName: "Actions",
      pinned: "right",
      lockVisible: true,
      sortable: false,
      filter: false,
      width: 200,
      cellRenderer: ActionsCell,
    },
  ];
}
