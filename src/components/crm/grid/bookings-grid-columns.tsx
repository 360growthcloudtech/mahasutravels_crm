"use client";

import * as React from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  BedDouble,
  ChevronDown,
  History,
  MoreHorizontal,
  MessageCircle,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/crm/status-badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CreatedAtDisplay } from "@/components/crm/created-at-display";
import { formatDisplayDate } from "@/components/crm/date-picker";
import {
  bookingRoute,
  type Booking,
  type BookingStatus,
  type Driver,
} from "@/lib/data";
import { assignedVehicleLabel, bookingDrivers, bookingHotels } from "@/lib/booking-utils";

export type BookingsGridActions = {
  statuses: BookingStatus[];
  drivers: Driver[];
  canCommentBooking: boolean;
  canEditBooking: boolean;
  canDeleteBooking: boolean;
  onStatusChange: (booking: Booking, status: BookingStatus) => void;
  onHistory: (booking: Booking) => void;
  onComments: (booking: Booking) => void;
  onInvoice: (booking: Booking) => void;
  onEdit: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
};

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

function BookingCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="flex items-center gap-1.5 text-sm font-medium text-ink-text">
        <span className="truncate">{data.customer}</span>
        {bookingHotels(data).length > 0 ? (
          <BedDouble className="size-3.5 shrink-0 text-marigold-ink" />
        ) : null}
      </p>
      <p className="font-mono-data text-[11px] text-slate-soft">
        {data.bookingNo ?? data.id}
      </p>
    </div>
  );
}

function TourCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm text-ink-text">{data.tourPackage || "—"}</p>
      <p className="truncate text-[11px] text-slate-soft">{bookingRoute(data)}</p>
    </div>
  );
}

function TravelCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return (
    <div className="flex h-full flex-col justify-center text-sm text-slate">
      <p>{formatDisplayDate(data.travelDate)}</p>
      {data.returnDate ? (
        <p className="text-[11px] text-slate-soft">to {formatDisplayDate(data.returnDate)}</p>
      ) : null}
    </div>
  );
}

function CabCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center text-sm text-slate">
      {data.cabType || "—"}{" "}
      <span className="text-slate-soft">
        · {data.adults}A{data.kids > 0 ? `+${data.kids}K` : ""} · {data.days}d
      </span>
    </div>
  );
}

function DriverCell({
  data,
  context,
}: ICellRendererParams<Booking, unknown, BookingsGridActions>) {
  if (!data || !context) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm text-ink-text">{formatDriversLabel(data)}</p>
      <p className="truncate font-mono-data text-[11px] text-slate-soft">
        {formatVehiclesLabel(data, context.drivers)}
      </p>
    </div>
  );
}

function MoneyCell({
  value,
  className,
}: {
  value: number | undefined;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full items-center justify-end font-mono-data text-sm ${className ?? "text-ink-text"}`}
    >
      ₹{(value ?? 0).toLocaleString("en-IN")}
    </div>
  );
}

function TotalCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return <MoneyCell value={data.total} />;
}

function AdvanceCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return <MoneyCell value={data.advance} className="text-teal" />;
}

function BalanceCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center justify-end font-mono-data text-sm text-signal">
      {data.balance > 0 ? `₹${data.balance.toLocaleString("en-IN")}` : "—"}
    </div>
  );
}

function PaymentCell({
  data,
  context,
}: ICellRendererParams<Booking, unknown, BookingsGridActions>) {
  if (!data || !context) return null;
  return (
    <div className="flex h-full flex-col justify-center space-y-0.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-1"
            aria-label={`Change payment status for ${data.customer}`}
          >
            <StatusBadge status={data.status} />
            <ChevronDown className="size-3.5 text-slate-soft" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Set payment status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {context.statuses.map((s) => (
            <DropdownMenuItem
              key={s}
              disabled={s === data.status}
              onSelect={() => context.onStatusChange(data, s)}
            >
              <StatusBadge status={s} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {data.paymentMode ? (
        <p className="truncate text-[10px] text-muted-foreground">{data.paymentMode}</p>
      ) : null}
    </div>
  );
}

function CreatedCell({ data }: ICellRendererParams<Booking>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center whitespace-nowrap text-sm text-slate">
      <CreatedAtDisplay iso={data.createdAt} stacked />
    </div>
  );
}

function ActionsCell({
  data,
  context,
}: ICellRendererParams<Booking, unknown, BookingsGridActions>) {
  if (!data || !context) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label={`Tracking history for ${data.customer}`}
              onClick={() => context.onHistory(data)}
            >
              <History className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">History</TooltipContent>
        </Tooltip>
        {context.canCommentBooking ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={`Comments for ${data.customer}`}
                onClick={() => context.onComments(data)}
              >
                <MessageCircle className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Comments</TooltipContent>
          </Tooltip>
        ) : null}
        {context.canEditBooking ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={`Invoice for ${data.customer}`}
                onClick={() => context.onInvoice(data)}
              >
                <Receipt className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Invoice</TooltipContent>
          </Tooltip>
        ) : null}
        {context.canEditBooking || context.canDeleteBooking ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="size-8">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {context.canEditBooking ? (
                      <DropdownMenuItem onSelect={() => context.onEdit(data)}>
                        <Pencil className="size-3.5" /> Edit booking
                      </DropdownMenuItem>
                    ) : null}
                    {context.canEditBooking && context.canDeleteBooking ? (
                      <DropdownMenuSeparator />
                    ) : null}
                    {context.canDeleteBooking ? (
                      <DropdownMenuItem
                        className="text-signal focus:bg-signal-soft"
                        onSelect={(e) => {
                          e.preventDefault();
                          context.onDelete(data);
                        }}
                      >
                        <Trash2 className="size-3.5" /> Delete booking
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">More actions</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

export function buildBookingsColumnDefs(): ColDef<Booking>[] {
  return [
    {
      colId: "customer",
      field: "customer",
      headerName: "Booking",
      pinned: "left",
      lockVisible: true,
      width: 200,
      filter: "agTextColumnFilter",
      cellRenderer: BookingCell,
    },
    {
      colId: "tour_package",
      field: "tourPackage",
      headerName: "Tour package / Route",
      width: 200,
      filter: "agTextColumnFilter",
      cellRenderer: TourCell,
    },
    {
      colId: "travel",
      field: "travelDate",
      headerName: "Travel dates",
      width: 150,
      filter: "agDateColumnFilter",
      cellRenderer: TravelCell,
    },
    {
      colId: "cab_type",
      field: "cabType",
      headerName: "Cab / pax / days",
      width: 150,
      filter: "agTextColumnFilter",
      cellRenderer: CabCell,
    },
    {
      colId: "driver",
      field: "driver",
      headerName: "Driver / Vehicle",
      width: 170,
      filter: "agTextColumnFilter",
      cellRenderer: DriverCell,
    },
    {
      colId: "total",
      field: "total",
      headerName: "Total",
      width: 110,
      filter: "agNumberColumnFilter",
      type: "rightAligned",
      cellRenderer: TotalCell,
    },
    {
      colId: "advance",
      field: "advance",
      headerName: "Advance",
      width: 110,
      filter: "agNumberColumnFilter",
      type: "rightAligned",
      cellRenderer: AdvanceCell,
    },
    {
      colId: "balance",
      field: "balance",
      headerName: "Balance",
      width: 110,
      filter: "agNumberColumnFilter",
      type: "rightAligned",
      cellRenderer: BalanceCell,
    },
    {
      colId: "status",
      field: "status",
      headerName: "Payment status",
      width: 150,
      filter: "agTextColumnFilter",
      cellRenderer: PaymentCell,
    },
    {
      colId: "created",
      field: "createdAt",
      headerName: "Created",
      width: 120,
      filter: "agDateColumnFilter",
      cellRenderer: CreatedCell,
    },
    {
      colId: "actions",
      headerName: "Actions",
      pinned: "right",
      lockVisible: true,
      sortable: false,
      filter: false,
      width: 168,
      cellRenderer: ActionsCell,
    },
  ];
}
