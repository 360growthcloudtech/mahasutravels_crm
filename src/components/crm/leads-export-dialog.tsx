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
import {
  ExportFilterChecklist,
  useExportDialogFilters,
} from "@/components/crm/export-filter-checklist";
import type { LeadsExportQuery } from "@/lib/leads-api";

export type LeadsExportDialogFilters = {
  search: string;
  status: string[];
  source: string[];
  website: string[];
  assigned_to: string[];
};

type LeadsExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFilters: LeadsExportDialogFilters;
  statusOptions: readonly string[];
  sourceOptions: readonly string[];
  websiteOptions: readonly string[];
  agentOptions: readonly string[];
  formatStatus: (code: string) => string;
  formatSource: (code: string) => string;
  formatWebsite: (domain: string) => string;
  formatAgent: (id: string) => string;
  hideAgentFilter?: boolean;
  exporting?: boolean;
  onExport: (query: LeadsExportQuery) => Promise<number>;
  onSuccess?: (count: number, filtered: boolean) => void;
  onError?: (message: string) => void;
};

const emptyFilters: LeadsExportDialogFilters = {
  search: "",
  status: [],
  source: [],
  website: [],
  assigned_to: [],
};

export function LeadsExportDialog({
  open,
  onOpenChange,
  initialFilters,
  statusOptions,
  sourceOptions,
  websiteOptions,
  agentOptions,
  formatStatus,
  formatSource,
  formatWebsite,
  formatAgent,
  hideAgentFilter,
  exporting = false,
  onExport,
  onSuccess,
  onError,
}: LeadsExportDialogProps) {
  const [filters, setFilters] = useExportDialogFilters(open, initialFilters);

  const hasExportFilters =
    filters.search.trim().length > 0 ||
    filters.status.length > 0 ||
    filters.source.length > 0 ||
    filters.website.length > 0 ||
    filters.assigned_to.length > 0;

  async function handleExport() {
    try {
      const count = await onExport({
        search: filters.search.trim() || undefined,
        status: filters.status.length ? filters.status : undefined,
        source: filters.source.length ? filters.source : undefined,
        website: filters.website.length ? filters.website : undefined,
        assigned_to: filters.assigned_to.length ? filters.assigned_to : undefined,
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
          <DialogTitle>Export leads to CSV</DialogTitle>
          <DialogDescription>
            Choose filters for the export. Leave everything empty to download all leads you can access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Search" hint="Name, phone, email, or lead number">
            <Input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search…"
              className="h-9 text-sm"
            />
          </Field>

          <Field label="Status">
            <ExportFilterChecklist
              options={statusOptions}
              selected={filters.status}
              onChange={(status) => setFilters((f) => ({ ...f, status }))}
              formatOption={formatStatus}
              emptyText="No statuses available"
            />
          </Field>

          <Field label="Source">
            <ExportFilterChecklist
              options={sourceOptions}
              selected={filters.source}
              onChange={(source) => setFilters((f) => ({ ...f, source }))}
              formatOption={formatSource}
              emptyText="No sources available"
            />
          </Field>

          <Field label="Website">
            <ExportFilterChecklist
              options={websiteOptions}
              selected={filters.website}
              onChange={(website) => setFilters((f) => ({ ...f, website }))}
              formatOption={formatWebsite}
              emptyText="No websites available"
            />
          </Field>

          {!hideAgentFilter ? (
            <Field label="Assigned agent">
              <ExportFilterChecklist
                options={agentOptions}
                selected={filters.assigned_to}
                onChange={(assigned_to) => setFilters((f) => ({ ...f, assigned_to }))}
                formatOption={formatAgent}
                emptyText="No agents available"
              />
            </Field>
          ) : null}
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
