"use client";

import * as React from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Car, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDisplayDate } from "@/components/crm/date-picker";
import {
  Booking,
  Driver,
  bookingRoute,
} from "@/lib/data";
import { assignedVehicleLabel, bookingDrivers, findDriverByAssignment } from "@/lib/booking-utils";
import { formatSeatCount, formatDriverStatusLabel } from "@/lib/driver-utils";
import { useDriverAvailability } from "@/lib/use-driver-availability";

export type AssignmentsGridActions = {
  drivers: Driver[];
  assignableDrivers: Driver[];
  canAssignDriver: boolean;
  onAssign: (booking: Booking, driver: Driver) => void;
};

function BookingCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm font-medium text-ink-text">{data.customer}</p>
      <p className="font-mono-data text-[11px] text-slate-soft">{data.bookingNo ?? data.id}</p>
    </div>
  );
}

function TravelCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return (
    <div className="flex h-full flex-col justify-center whitespace-nowrap text-sm">
      <p>
        {formatDisplayDate(data.travelDate)}
        {data.returnDate ? ` → ${formatDisplayDate(data.returnDate)}` : ""}
      </p>
      <p className="text-[11px] text-slate-soft">{data.days}d</p>
    </div>
  );
}

function PackageCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm text-ink-text">{data.tourPackage}</p>
      <p className="truncate text-[11px] text-slate-soft">{bookingRoute(data)}</p>
    </div>
  );
}

function DriverCell({
  data,
  context,
}: ICellRendererParams<Booking, unknown, AssignmentsGridActions>) {
  if (!data) return null;
  const assignments = bookingDrivers(data);
  const drivers = context?.drivers ?? [];
  if (assignments.length === 0) {
    return (
      <div className="flex h-full items-center">
        <Badge variant="outline">Unassigned</Badge>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col justify-center space-y-1 py-1">
      {assignments.map((a, i) => {
        const d = findDriverByAssignment(drivers, a.driver, a.vehicle);
        return (
          <div key={`${a.driver}-${a.vehicle}-${i}`}>
            <p className="text-sm font-medium text-ink-text">
              {a.driver}
              {i === 0 && assignments.length > 1 ? (
                <span className="ml-1 text-[10px] font-normal text-slate-soft">primary</span>
              ) : null}
            </p>
            {d ? (
              <p className="font-mono-data text-[11px] text-slate-soft">
                {d.driverNo ?? d.id} · {formatDriverStatusLabel(d.status)}
              </p>
            ) : (
              <p className="text-[11px] text-signal">Not in driver master</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VehicleCell({
  data,
  context,
}: ICellRendererParams<Booking, unknown, AssignmentsGridActions>) {
  if (!data) return null;
  const assignments = bookingDrivers(data);
  const drivers = context?.drivers ?? [];
  if (!assignments.length) {
    return <span className="font-mono-data text-sm text-slate-soft">—</span>;
  }
  return (
    <div className="flex h-full flex-col justify-center space-y-1 font-mono-data text-sm">
      {assignments.map((a, i) => (
        <p key={`${a.vehicle}-${i}`}>{assignedVehicleLabel(a, drivers)}</p>
      ))}
    </div>
  );
}

function AssignDriverMenu({
  booking,
  assignableDrivers,
  onAssign,
}: {
  booking: Booking;
  assignableDrivers: Driver[];
  onAssign: (driver: Driver) => void;
}) {
  const assigned = bookingDrivers(booking);
  const hasDriver = assigned.length > 0;
  const { occupiedSet: occupiedDriverNames } = useDriverAvailability({
    enabled: true,
    travel_date: booking.travelDate,
    return_date: booking.returnDate,
    exclude_booking_id: booking.id,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-full">
          {hasDriver ? "Reassign" : "Assign"}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[15rem]">
        <DropdownMenuLabel>Active drivers</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {assignableDrivers.length === 0 ? (
          <DropdownMenuItem disabled>No approved drivers</DropdownMenuItem>
        ) : (
          assignableDrivers.map((d) => {
            const alreadyAssigned =
              d.name === assigned[0]?.driver &&
              (d.vehicleType === assigned[0]?.vehicle || d.vehicle === assigned[0]?.vehicle);
            const unavailable = occupiedDriverNames.has(d.name);
            return (
              <DropdownMenuItem
                key={d.id}
                disabled={alreadyAssigned || unavailable}
                onSelect={() => {
                  if (unavailable) return;
                  onAssign(d);
                }}
              >
                <Car className="size-3.5" />
                <span className="min-w-0">
                  <span className="block text-sm">
                    {d.name}
                    {unavailable ? " · Not available" : ""}
                  </span>
                  <span className="block text-[10px] text-slate-soft">
                    {[d.vehicleType, formatSeatCount(d.vehicleCapacity)].filter(Boolean).join(" · ") ||
                      "No vehicle"}
                  </span>
                </span>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AssignCell({
  data,
  context,
}: ICellRendererParams<Booking, unknown, AssignmentsGridActions>) {
  if (!data || !context) return null;
  const assignments = bookingDrivers(data);
  if (!context.canAssignDriver) {
    return (
      <div className="flex h-full items-center">
        <Badge variant="outline">{assignments.length > 0 ? "Assigned" : "Unassigned"}</Badge>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center">
      <AssignDriverMenu
        booking={data}
        assignableDrivers={context.assignableDrivers}
        onAssign={(d) => context.onAssign(data, d)}
      />
    </div>
  );
}

export { AssignDriverMenu };

export function buildAssignmentsColumnDefs(): ColDef<Booking>[] {
  return [
    {
      colId: "customer",
      field: "customer",
      headerName: "Booking",
      pinned: "left",
      lockVisible: true,
      width: 180,
      filter: "agTextColumnFilter",
      cellRenderer: BookingCell,
    },
    {
      colId: "travel",
      field: "travelDate",
      headerName: "Travel",
      width: 160,
      filter: "agDateColumnFilter",
      cellRenderer: TravelCell,
    },
    {
      colId: "tour_package",
      field: "tourPackage",
      headerName: "Package / Route",
      flex: 1,
      minWidth: 180,
      filter: "agTextColumnFilter",
      cellRenderer: PackageCell,
    },
    {
      colId: "driver",
      field: "driver",
      headerName: "Driver",
      width: 180,
      filter: "agTextColumnFilter",
      cellRenderer: DriverCell,
    },
    {
      colId: "vehicle",
      field: "vehicle",
      headerName: "Vehicle",
      width: 150,
      filter: "agTextColumnFilter",
      cellRenderer: VehicleCell,
    },
    {
      colId: "actions",
      headerName: "Assign",
      pinned: "right",
      lockVisible: true,
      sortable: false,
      filter: false,
      width: 140,
      cellRenderer: AssignCell,
    },
  ];
}
