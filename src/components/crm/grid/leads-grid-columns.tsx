"use client";

import * as React from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  CalendarPlus,
  ChevronDown,
  Copy,
  FileText,
  History,
  MoreHorizontal,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
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
import type { Lead } from "@/lib/data";
import { sourceLabel } from "@/lib/lead-utils";
import { leadAttribution } from "@/lib/utm";

export type LeadStatusOption = { code: string; label: string };
export type LeadSourceOption = { code: string; label: string };

export type LeadsGridActions = {
  leadStatuses: LeadStatusOption[];
  leadSources: LeadSourceOption[];
  canCommentLead: boolean;
  canQuoteLead: boolean;
  canEditLead: boolean;
  canDeleteLead: boolean;
  canConvertToBooking: (lead: Lead) => boolean;
  onStatusChange: (lead: Lead, code: string, label: string) => void;
  onHistory: (lead: Lead) => void;
  onComments: (lead: Lead) => void;
  onQuote: (lead: Lead) => void;
  onCreateBooking: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
};

function formatNextFollowUp(date?: string, time?: string) {
  if (!date) return "—";
  const datePart = formatDisplayDate(date);
  if (!time) return datePart;
  const [h, m] = time.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  const timePart = `${h12}:${m ?? "00"} ${ampm}`;
  return `${datePart} · ${timePart}`;
}

function LeadCell({ data }: ICellRendererParams<Lead>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-ink-text">
        {data.name
          .split(" ")
          .map((n) => n[0])
          .join("")}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-ink-text">{data.name}</p>
          {data.inquiryCount > 1 ? (
            <span title={`Repeat inquiry · ${data.inquiryCount} times`}>
              <Copy className="size-3 text-signal" />
            </span>
          ) : null}
        </div>
        <p className="font-mono-data text-[11px] text-slate-soft">
          {data.leadNo} · {data.phone}
        </p>
      </div>
    </div>
  );
}

function TourCell({ data }: ICellRendererParams<Lead>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm text-ink-text">{data.tourPackage || "—"}</p>
      <p className="truncate text-[11px] text-slate-soft">
        {data.pickup}
        {data.drop ? ` → ${data.drop}` : ""}
      </p>
    </div>
  );
}

function StatusCell({
  data,
  context,
}: ICellRendererParams<Lead, unknown, LeadsGridActions>) {
  if (!data || !context) return null;
  return (
    <div className="flex h-full items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-1"
            aria-label={`Change status for ${data.name}`}
          >
            <StatusBadge status={data.status} />
            <ChevronDown className="size-3.5 text-slate-soft" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Set status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {context.leadStatuses.map((s) => (
            <DropdownMenuItem
              key={s.code}
              disabled={s.code === data.status}
              onSelect={() => context.onStatusChange(data, s.code, s.label)}
            >
              <StatusBadge status={s.code} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TravelCell({ data }: ICellRendererParams<Lead>) {
  if (!data) return null;
  return (
    <div className="flex h-full flex-col justify-center text-sm text-slate">
      <p>{formatDisplayDate(data.pickupDate)}</p>
      {data.dropDate ? (
        <p className="text-[11px] text-slate-soft">to {formatDisplayDate(data.dropDate)}</p>
      ) : null}
    </div>
  );
}

function CarCell({ data }: ICellRendererParams<Lead>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center text-sm text-slate">
      {data.car || "—"}{" "}
      <span className="text-slate-soft">
        · {data.adults}A{data.kids > 0 ? `+${data.kids}K` : ""} · {data.days}d
      </span>
    </div>
  );
}

function SourceCell({
  data,
  context,
}: ICellRendererParams<Lead, unknown, LeadsGridActions>) {
  if (!data || !context) return null;
  const attribution = leadAttribution(data);
  return (
    <div className="flex h-full flex-col justify-center space-y-0.5">
      <Badge variant="outline" className="w-fit font-normal">
        {sourceLabel(attribution.source, context.leadSources)}
      </Badge>
      {attribution.website ? (
        <p className="truncate text-[10px] text-muted-foreground">{attribution.website}</p>
      ) : null}
    </div>
  );
}

function UtmCell({ data }: ICellRendererParams<Lead>) {
  if (!data) return null;
  if (!data.pageUrl) return <span className="text-sm text-slate-soft">—</span>;
  return (
    <a
      href={data.pageUrl.startsWith("http") ? data.pageUrl : `https://${data.pageUrl}`}
      target="_blank"
      rel="noopener noreferrer"
      title={data.pageUrl}
      className="block truncate text-sm text-marigold hover:underline"
    >
      {data.pageUrl}
    </a>
  );
}

function CreatedCell({ data }: ICellRendererParams<Lead>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center whitespace-nowrap text-sm text-slate">
      <CreatedAtDisplay iso={data.createdAt} stacked />
    </div>
  );
}

function FollowUpCell({ data }: ICellRendererParams<Lead>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center whitespace-nowrap text-sm text-slate">
      {formatNextFollowUp(data.nextFollowUpDate, data.nextFollowUpTime)}
    </div>
  );
}

function PriceCell({ data }: ICellRendererParams<Lead>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center justify-end font-mono-data text-sm text-ink-text">
      ₹{data.price.toLocaleString("en-IN")}
    </div>
  );
}

function ActionsCell({
  data,
  context,
}: ICellRendererParams<Lead, unknown, LeadsGridActions>) {
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
              aria-label={`Tracking history for ${data.name}`}
              onClick={() => context.onHistory(data)}
            >
              <History className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">History</TooltipContent>
        </Tooltip>
        {context.canCommentLead ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={`Comments for ${data.name}`}
                onClick={() => context.onComments(data)}
              >
                <MessageCircle className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Comments</TooltipContent>
          </Tooltip>
        ) : null}
        {context.canQuoteLead ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={`Send quote for ${data.name}`}
                onClick={() => context.onQuote(data)}
              >
                <FileText className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Send quote</TooltipContent>
          </Tooltip>
        ) : null}
        {context.canConvertToBooking(data) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={`Create booking for ${data.name}`}
                onClick={() => context.onCreateBooking(data)}
              >
                <CalendarPlus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Create booking</TooltipContent>
          </Tooltip>
        ) : null}
        {context.canEditLead || context.canDeleteLead ? (
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
                    {context.canEditLead ? (
                      <DropdownMenuItem onSelect={() => context.onEdit(data)}>
                        <Pencil className="size-3.5" /> Edit lead
                      </DropdownMenuItem>
                    ) : null}
                    {context.canEditLead && context.canDeleteLead ? (
                      <DropdownMenuSeparator />
                    ) : null}
                    {context.canDeleteLead ? (
                      <DropdownMenuItem
                        className="text-signal focus:bg-signal-soft"
                        onSelect={(e) => {
                          e.preventDefault();
                          context.onDelete(data);
                        }}
                      >
                        <Trash2 className="size-3.5" /> Delete lead
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

export function buildLeadsColumnDefs(): ColDef<Lead>[] {
  return [
    {
      colId: "name",
      field: "name",
      headerName: "Lead",
      pinned: "left",
      lockVisible: true,
      width: 220,
      filter: "agTextColumnFilter",
      cellRenderer: LeadCell,
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
      colId: "status",
      field: "status",
      headerName: "Status",
      width: 140,
      filter: "agTextColumnFilter",
      cellRenderer: StatusCell,
    },
    {
      colId: "travel",
      field: "pickupDate",
      headerName: "Travel dates",
      width: 150,
      filter: "agDateColumnFilter",
      cellRenderer: TravelCell,
    },
    {
      colId: "car",
      field: "car",
      headerName: "Car / pax / days",
      width: 150,
      filter: "agTextColumnFilter",
      cellRenderer: CarCell,
    },
    {
      colId: "source",
      field: "source",
      headerName: "Source",
      width: 140,
      filter: "agTextColumnFilter",
      cellRenderer: SourceCell,
    },
    {
      colId: "assigned",
      headerName: "Assigned",
      width: 130,
      filter: "agTextColumnFilter",
      valueGetter: (p) => p.data?.assignedTo?.name || "Unassigned",
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
      colId: "followup",
      field: "nextFollowUpDate",
      headerName: "Next follow-up",
      width: 150,
      filter: "agDateColumnFilter",
      cellRenderer: FollowUpCell,
    },
    {
      colId: "price",
      field: "price",
      headerName: "Price",
      width: 110,
      filter: "agNumberColumnFilter",
      type: "rightAligned",
      cellRenderer: PriceCell,
    },
    {
      colId: "page_url",
      field: "pageUrl",
      headerName: "UTM URL",
      width: 180,
      filter: "agTextColumnFilter",
      cellRenderer: UtmCell,
    },
    {
      colId: "actions",
      headerName: "Actions",
      pinned: "right",
      lockVisible: true,
      sortable: false,
      filter: false,
      width: 176,
      cellRenderer: ActionsCell,
    },
  ];
}
