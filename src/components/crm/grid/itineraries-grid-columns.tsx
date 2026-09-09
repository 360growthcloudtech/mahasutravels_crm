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
import { itineraryPriceAfterDiscount, type ItineraryTemplate } from "@/lib/data";

export type ItinerariesGridActions = {
  canEditItinerary: boolean;
  canDeleteItinerary: boolean;
  onEdit: (itinerary: ItineraryTemplate) => void;
  onDuplicate: (itinerary: ItineraryTemplate) => void;
  onArchiveToggle: (itinerary: ItineraryTemplate) => void;
  onDelete: (itinerary: ItineraryTemplate) => void;
};

function durationLabel(t: Pick<ItineraryTemplate, "nights" | "days">) {
  const nights = t.nights?.trim() || "—";
  const days = t.days?.trim() || "—";
  return `${nights}N / ${days}D`;
}

function TemplateCell({ data }: ICellRendererParams<ItineraryTemplate>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm font-medium text-ink-text">{data.name}</p>
      <p className="font-mono-data text-[11px] text-slate-soft">{data.itineraryNo}</p>
      {data.subtitle ? (
        <p className="mt-0.5 truncate text-xs text-slate">{data.subtitle}</p>
      ) : null}
    </div>
  );
}

function FromCell({ data }: ICellRendererParams<ItineraryTemplate>) {
  if (!data) return null;
  return (
    <div className="flex h-full flex-col justify-center whitespace-nowrap font-mono-data text-sm">
      <p>₹{data.startingFrom.toLocaleString("en-IN")}</p>
      {(data.discountPercentage ?? 0) > 0 ? (
        <p className="text-[11px] text-teal">
          ₹
          {itineraryPriceAfterDiscount(data.startingFrom, data.discountPercentage).toLocaleString(
            "en-IN"
          )}{" "}
          after discount
        </p>
      ) : null}
    </div>
  );
}

function DiscountCell({ data }: ICellRendererParams<ItineraryTemplate>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center whitespace-nowrap text-sm text-slate">
      {(data.discountPercentage ?? 0) > 0 ? `${data.discountPercentage}%` : "—"}
    </div>
  );
}

function StatusCell({ data }: ICellRendererParams<ItineraryTemplate>) {
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
}: ICellRendererParams<ItineraryTemplate, unknown, ItinerariesGridActions>) {
  if (!data || !context) return null;
  if (!context.canEditItinerary && !context.canDeleteItinerary) return null;
  return (
    <div className="flex h-full items-center justify-end gap-1">
      {context.canEditItinerary ? (
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
      {context.canEditItinerary || context.canDeleteItinerary ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {context.canEditItinerary ? (
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
            {context.canEditItinerary && context.canDeleteItinerary ? (
              <DropdownMenuSeparator />
            ) : null}
            {context.canDeleteItinerary ? (
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

export function buildItinerariesColumnDefs(): ColDef<ItineraryTemplate>[] {
  return [
    {
      colId: "name",
      field: "name",
      headerName: "Template",
      pinned: "left",
      lockVisible: true,
      width: 240,
      filter: "agTextColumnFilter",
      cellRenderer: TemplateCell,
    },
    {
      colId: "tour_package",
      field: "tourPackage",
      headerName: "Package",
      width: 200,
      filter: "agTextColumnFilter",
    },
    {
      colId: "nights",
      field: "nights",
      headerName: "Duration",
      width: 120,
      filter: "agTextColumnFilter",
      valueGetter: (p) => (p.data ? durationLabel(p.data) : ""),
    },
    {
      colId: "starting_from",
      field: "startingFrom",
      headerName: "From",
      width: 140,
      filter: "agNumberColumnFilter",
      type: "rightAligned",
      cellRenderer: FromCell,
    },
    {
      colId: "discount_percentage",
      field: "discountPercentage",
      headerName: "Discount",
      width: 110,
      filter: "agNumberColumnFilter",
      cellRenderer: DiscountCell,
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
