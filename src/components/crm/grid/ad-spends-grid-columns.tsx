"use client";

import * as React from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdSpendDialog } from "@/components/crm/ad-spend-dialog";
import { formatDisplayTime } from "@/lib/lead-utils";
import type { AdSpendEntry } from "@/lib/data";

export type AdSpendsGridActions = {
  canEditAdSpend: boolean;
  canDeleteAdSpend: boolean;
  onUpdate: (id: string, data: Omit<AdSpendEntry, "id" | "createdAt">) => Promise<void>;
  onDelete: (spend: AdSpendEntry) => void;
};

function formatSpendDateTime(date?: string, time?: string) {
  const dateValue = date?.trim();
  const parsedDate = dateValue
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? `${dateValue}T12:00:00` : dateValue)
    : null;
  if (!parsedDate || !Number.isFinite(parsedDate.getTime())) return null;

  return {
    date: parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: formatDisplayTime(time),
  };
}

function PlatformCell({ data }: ICellRendererParams<AdSpendEntry>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center">
      <Badge
        variant={
          data.platform === "Google Ads"
            ? "marigold"
            : data.platform === "Meta Ads"
              ? "violet"
              : "teal"
        }
      >
        {data.platform}
      </Badge>
    </div>
  );
}

function WebsiteCell({ data }: ICellRendererParams<AdSpendEntry>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center text-sm text-slate">
      {data.website ? data.website : <span className="text-muted-foreground">—</span>}
    </div>
  );
}

function CampaignCell({ data }: ICellRendererParams<AdSpendEntry>) {
  if (!data) return null;
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <p className="truncate text-sm font-medium text-ink-text">
        {data.campaignName || "General Marketing Budget"}
      </p>
      {data.notes ? (
        <p className="truncate text-[11px] text-slate-soft">{data.notes}</p>
      ) : null}
    </div>
  );
}

function DateCell({ data }: ICellRendererParams<AdSpendEntry>) {
  if (!data) return null;
  const formatted = formatSpendDateTime(data.date, data.time);
  if (!formatted) return <span className="text-slate-soft">—</span>;
  return (
    <div className="flex h-full flex-col justify-center whitespace-nowrap text-sm text-slate">
      <p>{formatted.date}</p>
      {formatted.time ? (
        <p className="font-mono-data text-[11px] text-slate-soft">{formatted.time}</p>
      ) : null}
    </div>
  );
}

function AmountCell({ data }: ICellRendererParams<AdSpendEntry>) {
  if (!data) return null;
  return (
    <div className="flex h-full items-center justify-end font-mono-data text-sm font-semibold text-ink-text">
      ₹{data.amount.toLocaleString("en-IN")}
    </div>
  );
}

function ActionsCell({
  data,
  context,
}: ICellRendererParams<AdSpendEntry, unknown, AdSpendsGridActions>) {
  if (!data || !context) return null;
  if (!context.canEditAdSpend && !context.canDeleteAdSpend) return null;
  return (
    <div className="flex h-full items-center justify-end gap-1">
      {context.canEditAdSpend ? (
        <AdSpendDialog
          spend={data}
          trigger={
            <Button variant="ghost" size="icon" className="size-8" aria-label="Edit ad spend">
              <Pencil className="size-4 text-slate" />
            </Button>
          }
          onSubmit={(payload) => context.onUpdate(data.id, payload)}
        />
      ) : null}
      {context.canDeleteAdSpend ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 hover:text-signal"
          aria-label="Delete ad spend"
          onClick={() => context.onDelete(data)}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function buildAdSpendsColumnDefs(): ColDef<AdSpendEntry>[] {
  return [
    {
      colId: "platform",
      field: "platform",
      headerName: "Platform",
      width: 140,
      filter: "agTextColumnFilter",
      cellRenderer: PlatformCell,
    },
    {
      colId: "website",
      field: "website",
      headerName: "Website Domain",
      width: 180,
      filter: "agTextColumnFilter",
      cellRenderer: WebsiteCell,
    },
    {
      colId: "campaign_name",
      field: "campaignName",
      headerName: "Campaign Name & Details",
      flex: 1,
      minWidth: 220,
      filter: "agTextColumnFilter",
      cellRenderer: CampaignCell,
    },
    {
      colId: "spend_date",
      field: "date",
      headerName: "Date",
      width: 140,
      filter: "agDateColumnFilter",
      cellRenderer: DateCell,
    },
    {
      colId: "amount",
      field: "amount",
      headerName: "Amount (₹)",
      width: 130,
      filter: "agNumberColumnFilter",
      cellRenderer: AmountCell,
      type: "rightAligned",
    },
    {
      colId: "actions",
      headerName: "Actions",
      pinned: "right",
      lockVisible: true,
      sortable: false,
      filter: false,
      width: 110,
      cellRenderer: ActionsCell,
    },
  ];
}
