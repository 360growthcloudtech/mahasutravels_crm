"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/crm/field";
import { DatePicker } from "@/components/crm/date-picker";
import {
  ExportFilterChecklist,
  useExportDialogFilters,
} from "@/components/crm/export-filter-checklist";
import type { BookingsExportQuery } from "@/lib/bookings-api";
import type { BookingStatus } from "@/lib/data";

export type BookingsExportDialogFilters = {
  search: string;
  status: BookingStatus[];
  website: string[];
  driver: string[];
  travelFrom: string;
  travelTo: string;
  hotel: Array<"With hotel" | "No hotel">;
};

type BookingsExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFilters: BookingsExportDialogFilters;
  statusOptions: readonly BookingStatus[];
  websiteOptions: readonly string[];
  driverOptions: readonly string[];
  exporting?: boolean;
  onExport: (query: BookingsExportQuery) => Promise<number>;
  onSuccess?: (count: number, filtered: boolean) => void;
  onError?: (message: string) => void;
};

const emptyFilters: BookingsExportDialogFilters = {
  search: "",
  status: [],
  website: [],
  driver: [],
  travelFrom: "",
  travelTo: "",
  hotel: [],
};

export function BookingsExportDialog({
  open,
  onOpenChange,
  initialFilters,
  statusOptions,
  websiteOptions,
  driverOptions,
  exporting = false,
  onExport,
  onSuccess,
  onError,
}: BookingsExportDialogProps) {
  const [filters, setFilters] = useExportDialogFilters(open, initialFilters);

  const hasExportFilters =
    filters.search.trim().length > 0 ||
    filters.status.length > 0 ||
    filters.website.length > 0 ||
    filters.driver.length > 0 ||
    filters.travelFrom.length > 0 ||
    filters.travelTo.length > 0 ||
    filters.hotel.length > 0;

  async function handleExport() {
    try {
      const count = await onExport({
        search: filters.search.trim() || undefined,
        status: filters.status.length ? filters.status : undefined,
        website: filters.website.length ? filters.website : undefined,
        driver: filters.driver.length ? filters.driver : undefined,
        travel_from: filters.travelFrom || undefined,
        travel_to: filters.travelTo || undefined,
        hotel: filters.hotel.length
          ? filters.hotel.map((h) => (h === "With hotel" ? "with_hotel" : "no_hotel"))
          : undefined,
      });
      onSuccess?.(count, hasExportFilters);
      onOpenChange(false);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !exporting && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export bookings to CSV</DialogTitle>
          <DialogDescription>
            Choose filters for the export. Leave everything empty to download all bookings you can access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Search" hint="Customer, email, phone, or booking ID">
            <Input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search…"
              className="h-9 text-sm"
            />
          </Field>

          <Field label="Payment status">
            <ExportFilterChecklist
              options={statusOptions}
              selected={filters.status}
              onChange={(status) => setFilters((f) => ({ ...f, status }))}
            />
          </Field>

          <Field label="Website">
            <ExportFilterChecklist
              options={websiteOptions}
              selected={filters.website}
              onChange={(website) => setFilters((f) => ({ ...f, website }))}
            />
          </Field>

          <Field label="Driver">
            <ExportFilterChecklist
              options={driverOptions}
              selected={filters.driver}
              onChange={(driver) => setFilters((f) => ({ ...f, driver }))}
              emptyText="No drivers in bookings"
            />
          </Field>

          <Field label="Hotel add-on">
            <ExportFilterChecklist
              options={["With hotel", "No hotel"] as const}
              selected={filters.hotel}
              onChange={(hotel) => setFilters((f) => ({ ...f, hotel }))}
            />
          </Field>

          <Field label="Travel date range" hint="Filters by trip start date">
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker
                value={filters.travelFrom}
                onChange={(travelFrom) => setFilters((f) => ({ ...f, travelFrom }))}
                placeholder="From"
                className="h-9 w-[9rem] text-xs"
                maxDate={filters.travelTo || undefined}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <DatePicker
                value={filters.travelTo}
                onChange={(travelTo) => setFilters((f) => ({ ...f, travelTo }))}
                placeholder="To"
                className="h-9 w-[9rem] text-xs"
                minDate={filters.travelFrom || undefined}
              />
            </div>
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={exporting}
            onClick={() => setFilters(emptyFilters)}
          >
            Clear filters
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={exporting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="marigold" disabled={exporting} onClick={() => void handleExport()}>
              <Download className="size-4" />
              {exporting ? "Exporting…" : hasExportFilters ? "Export filtered" : "Export all"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
