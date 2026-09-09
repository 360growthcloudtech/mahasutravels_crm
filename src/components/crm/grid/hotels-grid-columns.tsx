"use client";

import * as React from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Archive, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/crm/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { HotelTemplate } from "@/lib/data";

export type HotelsGridActions = {
  canEditHotel: boolean;
  canDeleteHotel: boolean;
  onEdit: (hotel: HotelTemplate) => void;
  onDuplicate: (hotel: HotelTemplate) => void;
  onArchiveToggle: (hotel: HotelTemplate) => void;
  onDelete: (hotel: HotelTemplate) => void;
};

function HotelCell({ data }: ICellRendererParams<HotelTemplate>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm font-medium text-ink-text">{data.name}</p>
      <p className="font-mono-data text-[11px] text-slate-soft">{data.hotelNo}</p>
      {data.address ? (
        <p className="mt-0.5 truncate text-xs text-slate">{data.address}</p>
      ) : null}
    </div>
  );
}

function RateCell({ data }: ICellRendererParams<HotelTemplate>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center font-mono-data text-sm text-ink-text">
      ₹{data.typicalRate.toLocaleString("en-IN")}
    </div>
  );
}

function StatusCell({ data }: ICellRendererParams<HotelTemplate>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center">
      <StatusBadge status={data.status} />
    </div>
  );
}

function ActionsCell({
  data,
  context,
}: ICellRendererParams<HotelTemplate, unknown, HotelsGridActions>) {
  if (!data || !context) return null;
  if (!context.canEditHotel && !context.canDeleteHotel) return null;
  return (
    <div className="flex h-full items-center justify-end gap-1">
      {context.canEditHotel ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Edit ${data.name}`}
          onClick={() => context.onEdit(data)}
        >
          <Pencil className="size-3.5" />
        </Button>
      ) : null}
      {context.canEditHotel || context.canDeleteHotel ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {context.canEditHotel ? (
              <>
                <DropdownMenuItem onSelect={() => context.onEdit(data)}>
                  <Pencil className="size-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => context.onDuplicate(data)}>
                  <Copy className="size-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => context.onArchiveToggle(data)}>
                  <Archive className="size-3.5" />{" "}
                  {data.status !== "Archived" ? "Archive" : "Restore"}
                </DropdownMenuItem>
              </>
            ) : null}
            {context.canEditHotel && context.canDeleteHotel ? <DropdownMenuSeparator /> : null}
            {context.canDeleteHotel ? (
              <DropdownMenuItem
                className="text-signal focus:text-signal"
                onSelect={() => context.onDelete(data)}
              >
                <Trash2 className="size-3.5" /> Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export function buildHotelsColumnDefs(): ColDef<HotelTemplate>[] {
  return [
    {
      colId: "name",
      field: "name",
      headerName: "Hotel",
      pinned: "left",
      lockVisible: true,
      width: 240,
      filter: "agTextColumnFilter",
      cellRenderer: HotelCell,
    },
    {
      colId: "city",
      field: "city",
      headerName: "City",
      width: 130,
      filter: "agTextColumnFilter",
    },
    {
      colId: "default_room_type",
      field: "defaultRoomType",
      headerName: "Default room",
      width: 160,
      filter: "agTextColumnFilter",
      valueFormatter: (p) => p.value || "—",
    },
    {
      colId: "typical_rate",
      field: "typicalRate",
      headerName: "Typical rate / day",
      width: 150,
      filter: "agNumberColumnFilter",
      type: "rightAligned",
      cellRenderer: RateCell,
    },
    {
      colId: "status",
      field: "status",
      headerName: "Status",
      width: 120,
      filter: "agTextColumnFilter",
      cellRenderer: StatusCell,
    },
    {
      colId: "updated",
      field: "updatedAt",
      headerName: "Updated",
      width: 120,
      filter: "agDateColumnFilter",
    },
    {
      colId: "actions",
      headerName: "Actions",
      pinned: "right",
      lockVisible: true,
      sortable: false,
      filter: false,
      width: 100,
      cellRenderer: ActionsCell,
    },
  ];
}
