"use client";

import * as React from "react";
import {
  CalendarPlus,
  ChevronDown,
  Copy,
  Download,
  Filter,
  FileText,
  History,
  MoreHorizontal,
  MessageCircle,
  Plus,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Topbar } from "@/components/crm/topbar";
import { TableRefreshButton } from "@/components/crm/table-refresh-button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CrmGrid, type GridPageRequest } from "@/components/crm/grid/crm-grid";
import {
  buildLeadsColumnDefs,
  type LeadsGridActions,
} from "@/components/crm/grid/leads-grid-columns";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { LeadCommentsDrawer } from "@/components/crm/lead-comments-drawer";
import { LeadHistoryDrawer } from "@/components/crm/lead-history-drawer";
import { LeadQuoteDrawer } from "@/components/crm/lead-quote-drawer";
import { BookingFormDialog } from "@/components/crm/booking-form-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Booking, Lead } from "@/lib/data";
import { formatDisplayTime, formatRelativeTime, sourceLabel } from "@/lib/lead-utils";
import { leadAttribution } from "@/lib/utm";
import { downloadLeadsCsv, fetchLeadsPage, leadFromApi } from "@/lib/leads-api";
import { LeadsExportDialog } from "@/components/crm/leads-export-dialog";
import { useSession } from "@/lib/session-context";
import { useHasPermission } from "@/lib/use-has-permission";
import { formatDisplayDate } from "@/components/crm/date-picker";
import {
  DateRangeFilter,
  type DashboardDateRange,
  rangeToISO,
} from "@/components/crm/date-range-filter";
import {
  PagePagination,
} from "@/components/crm/list-pagination";
import {
  RecordCardsSkeleton,
  StatCardsSkeleton,
} from "@/components/crm/skeletons";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import { CreatedAtDisplay } from "@/components/crm/created-at-display";
import type { GridApi } from "ag-grid-community";

const LEADS_PAGE_SIZE = 25;

function formatNextFollowUp(date?: string, time?: string) {
  if (!date) return "—";
  const datePart = formatDisplayDate(date);
  const timePart = formatDisplayTime(time);
  return timePart ? `${datePart} · ${timePart}` : datePart;
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function MultiFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
  formatOption,
  emptyText = "No options",
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  formatOption?: (value: T) => string;
  emptyText?: string;
}) {
  const count = selected.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal">
          <Filter className="size-3.5 text-slate-soft" />
          {label}
          {count > 0 ? (
            <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1.5">
              {count}
            </Badge>
          ) : (
            <ChevronDown className="size-3.5 text-slate-soft" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[14rem]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <DropdownMenuItem disabled className="text-muted-foreground">
            {emptyText}
          </DropdownMenuItem>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={selected.includes(option)}
              onCheckedChange={() => onChange(toggleValue(selected, option))}
              onSelect={(e) => e.preventDefault()}
            >
              {formatOption ? formatOption(option) : option}
            </DropdownMenuCheckboxItem>
          ))
        )}
        {count > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-slate"
              onSelect={() => onChange([])}
            >
              Clear {label.toLowerCase()}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function LeadsPage() {
  const {
    state,
    assignees,
    leadStatuses,
    leadSources,
    websites,
    leadsLoading,
    refreshLeads,
    addLead,
    updateLead,
    deleteLead,
    addLeadComment,
    loadLeadComments,
    loadLeadActivity,
    addBooking,
  } = useData();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [searchUnlocked, setSearchUnlocked] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = React.useState<string[]>([]);
  /** Agent filter stores assignee user ids, plus `"unassigned"`. */
  const [agentFilter, setAgentFilter] = React.useState<string[]>([]);
  const [websiteFilter, setWebsiteFilter] = React.useState<string[]>([]);
  const [createdRange, setCreatedRange] = React.useState<DashboardDateRange>(null);
  const [page, setPage] = React.useState(1);
  const [pageLeads, setPageLeads] = React.useState<Lead[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listStats, setListStats] = React.useState({
    total: 0,
    booked: 0,
    open: 0,
    repeat: 0,
  });
  const [listPagination, setListPagination] = React.useState({
    page: 1,
    pageSize: LEADS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [deleteTarget, setDeleteTarget] = React.useState<Lead | null>(null);
  const [editingLeadId, setEditingLeadId] = React.useState<string | null>(null);
  const [commentLeadId, setCommentLeadId] = React.useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [historyLeadId, setHistoryLeadId] = React.useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [quoteLeadId, setQuoteLeadId] = React.useState<string | null>(null);
  const [bookingLead, setBookingLead] = React.useState<Lead | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const { session } = useSession();
  const isEmployee = session?.role === "Employee";
  const canExportLeads = useHasPermission("leads.export");
  const canCreateLead = useHasPermission("leads.create");
  const canEditLead = useHasPermission("leads.edit");
  const canDeleteLead = useHasPermission("leads.delete");
  const canCommentLead = useHasPermission("leads.comment");
  const canQuoteLead = useHasPermission("leads.quote");
  const canCreateBookingFromLead = useHasPermission("leads.create_booking");
  const gridApiRef = React.useRef<GridApi<Lead> | null>(null);
  const columnDefs = React.useMemo(() => buildLeadsColumnDefs(), []);
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const createdBounds = rangeToISO(createdRange);
  const filterKey = [
    debouncedQuery,
    statusFilter.join(","),
    sourceFilter.join(","),
    agentFilter.join(","),
    websiteFilter.join(","),
    createdBounds ? `${createdBounds.from}:${createdBounds.to}` : "",
  ].join("|");

  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const toolbarFilters = React.useMemo(
    () => ({
      search: debouncedQuery || undefined,
      status: statusFilter.length ? statusFilter : undefined,
      source: sourceFilter.length ? sourceFilter : undefined,
      website: websiteFilter.length ? websiteFilter : undefined,
      assigned_to: !isEmployee && agentFilter.length ? agentFilter : undefined,
      created_from: createdBounds?.from,
      created_to: createdBounds?.to,
    }),
    [
      debouncedQuery,
      statusFilter,
      sourceFilter,
      websiteFilter,
      agentFilter,
      isEmployee,
      createdBounds?.from,
      createdBounds?.to,
    ]
  );

  const loadLeadsPage = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchLeadsPage({
        ...toolbarFilters,
        page,
        pageSize: LEADS_PAGE_SIZE,
      });
      setPageLeads(
        data.leads.map((row) => leadFromApi(row, state.leadItineraries[row.id]))
      );
      setListStats(data.stats);
      setListPagination(data.pagination);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load leads",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setListLoading(false);
    }
  }, [toolbarFilters, page, state.leadItineraries, toast]);

  React.useEffect(() => {
    if (isDesktop) return;
    void loadLeadsPage();
  }, [loadLeadsPage, isDesktop]);

  React.useEffect(() => {
    if (listPagination.totalPages > 0 && page > listPagination.totalPages) {
      setPage(listPagination.totalPages);
    }
  }, [listPagination.totalPages, page]);

  async function reloadLeads() {
    gridApiRef.current?.refreshInfiniteCache();
    if (!isDesktop) await loadLeadsPage();
    await refreshLeads();
  }

  const fetchGridPage = React.useCallback(
    async (request: GridPageRequest) => {
      const data = await fetchLeadsPage({
        ...toolbarFilters,
        page: request.page,
        pageSize: request.pageSize,
        sortBy: request.sortBy,
        sortDir: request.sortDir,
        colFilters: request.colFilters,
      });
      return {
        rows: data.leads.map((row) => leadFromApi(row, state.leadItineraries[row.id])),
        total: data.pagination.total,
        stats: data.stats,
      };
    },
    [toolbarFilters, state.leadItineraries]
  );

  const editingLead =
    (editingLeadId ? pageLeads.find((l) => l.id === editingLeadId) : null) ??
    (editingLeadId ? state.leads.find((l) => l.id === editingLeadId) ?? null : null);

  const bookedLeadIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const b of state.bookings) {
      if (b.leadId) ids.add(b.leadId);
    }
    return ids;
  }, [state.bookings]);

  const gridActions = React.useMemo<LeadsGridActions>(
    () => ({
      leadStatuses,
      leadSources,
      canCommentLead,
      canQuoteLead,
      canEditLead,
      canDeleteLead,
      canConvertToBooking: (lead) =>
        canCreateBookingFromLead && !bookedLeadIds.has(lead.id),
      onStatusChange: (lead, code, label) => handleLeadStatusChange(lead, code, label),
      onHistory: (lead) => setHistoryLeadId(lead.id),
      onComments: (lead) => setCommentLeadId(lead.id),
      onQuote: (lead) => setQuoteLeadId(lead.id),
      onCreateBooking: (lead) => setBookingLead(lead),
      onEdit: (lead) => setEditingLeadId(lead.id),
      onDelete: (lead) => setDeleteTarget(lead),
    }),
    [
      leadStatuses,
      leadSources,
      canCommentLead,
      canQuoteLead,
      canEditLead,
      canDeleteLead,
      canCreateBookingFromLead,
      bookedLeadIds,
    ]
  );

  function leadCanConvertToBooking(lead: Lead) {
    return canCreateBookingFromLead && !bookedLeadIds.has(lead.id);
  }

  function handleLeadStatusChange(lead: Lead, code: string, label: string) {
    // Booked: update lead via API first, then open booking drawer on success
    if (code === "Booked" && leadCanConvertToBooking(lead)) {
      void updateLead(lead.id, { status: "Booked" })
        .then(() => {
          toast({
            variant: "success",
            title: "Status updated",
            description: `${lead.name} moved to ${label}. Add booking details next.`,
          });
          setBookingLead({ ...lead, status: "Booked" });
          void reloadLeads();
        })
        .catch((error) =>
          toast({
            variant: "error",
            title: "Could not update status",
            description: error instanceof Error ? error.message : "Please try again.",
          })
        );
      return;
    }
    void updateLead(lead.id, { status: code })
      .then(() => {
        toast({
          variant: "success",
          title: "Status updated",
          description: `${lead.name} moved to ${label}.`,
        });
        void reloadLeads();
      })
      .catch((error) =>
        toast({
          variant: "error",
          title: "Could not update status",
          description: error instanceof Error ? error.message : "Please try again.",
        })
      );
  }

  async function handleCreateBookingFromLead(data: Omit<Booking, "id" | "bookingNo">) {
    if (!bookingLead) return;
    const lead = bookingLead;
    try {
      await addBooking({
        ...data,
        leadId: lead.id,
      });
      // Status may already be Booked (status-dropdown flow); ensure it if opened via button
      if (lead.status !== "Booked") {
        try {
          await updateLead(lead.id, { status: "Booked" });
        } catch {
          toast({
            variant: "error",
            title: "Booking created",
            description: "Booking was saved, but the lead status could not be set to Booked.",
          });
          setBookingLead(null);
          return;
        }
      }
      toast({
        variant: "success",
        title: "Booking created",
        description: `${lead.leadNo} · ${data.customer} is on the books.`,
      });
      setBookingLead(null);
      void reloadLeads();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not create booking",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  const commentLead = commentLeadId
    ? pageLeads.find((l) => l.id === commentLeadId) ??
      state.leads.find((l) => l.id === commentLeadId) ??
      null
    : null;
  const historyLead = historyLeadId
    ? pageLeads.find((l) => l.id === historyLeadId) ??
      state.leads.find((l) => l.id === historyLeadId) ??
      null
    : null;
  const quoteLead = quoteLeadId
    ? pageLeads.find((l) => l.id === quoteLeadId) ??
      state.leads.find((l) => l.id === quoteLeadId) ??
      null
    : null;

  React.useEffect(() => {
    if (!commentLeadId) {
      setCommentsLoading(false);
      return;
    }
    let cancelled = false;
    setCommentsLoading(true);
    void loadLeadComments(commentLeadId).finally(() => {
      if (!cancelled) setCommentsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [commentLeadId, loadLeadComments]);

  React.useEffect(() => {
    if (!historyLeadId) {
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    void loadLeadActivity(historyLeadId).finally(() => {
      if (!cancelled) setHistoryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [historyLeadId, loadLeadActivity]);

  // Master-backed filter options from /api/leads/masters + /api/users
  const statusCodes = leadStatuses.map((s) => s.code);
  const sourceCodes = leadSources.map((s) => s.code);
  const websiteDomains = websites.map((w) => w.domain);
  const agentOptions = React.useMemo(
    () => ["unassigned", ...assignees.map((a) => a.id)],
    [assignees]
  );

  // Drop stale selections if masters/users change (e.g. deactivated website).
  React.useEffect(() => {
    setWebsiteFilter((prev) => prev.filter((d) => websiteDomains.includes(d)));
  }, [websiteDomains.join("|")]);
  React.useEffect(() => {
    setStatusFilter((prev) => prev.filter((c) => statusCodes.includes(c)));
  }, [statusCodes.join("|")]);
  React.useEffect(() => {
    setSourceFilter((prev) => prev.filter((c) => sourceCodes.includes(c)));
  }, [sourceCodes.join("|")]);
  React.useEffect(() => {
    setAgentFilter((prev) => prev.filter((id) => agentOptions.includes(id)));
  }, [agentOptions.join("|")]);

  const hasFilters =
    debouncedQuery.length > 0 ||
    statusFilter.length > 0 ||
    sourceFilter.length > 0 ||
    agentFilter.length > 0 ||
    websiteFilter.length > 0 ||
    createdRange != null;

  const exportInitialFilters = React.useMemo(
    () => ({
      search: query,
      status: statusFilter,
      source: sourceFilter,
      website: websiteFilter,
      assigned_to: agentFilter,
      createdRange,
    }),
    [query, statusFilter, sourceFilter, websiteFilter, agentFilter, createdRange]
  );

  const visible = pageLeads;
  const rangeStart =
    listPagination.total === 0 ? 0 : (listPagination.page - 1) * listPagination.pageSize + 1;
  const rangeEnd = Math.min(
    listPagination.page * listPagination.pageSize,
    listPagination.total
  );

  return (
    <>
      <Topbar
        title="Leads"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TableRefreshButton onRefresh={reloadLeads} loading={listLoading} />
            {canCreateLead ? (
              <LeadFormDialog
                trigger={
                  <Button variant="marigold">
                    <Plus className="size-4" /> Add Lead
                  </Button>
                }
                onSubmit={async (data) => {
                  try {
                    const created = await addLead(data);
                    toast({
                      variant: "success",
                      title: created.inquiryCount > 1 ? "Repeat inquiry updated" : "Lead added",
                      description:
                        created.inquiryCount > 1
                          ? `${created.name} already had an open lead · inquiry #${created.inquiryCount}.`
                          : `${created.name} was added to the pipeline.`,
                    });
                    void reloadLeads();
                  } catch (error) {
                    toast({
                      variant: "error",
                      title: "Could not add lead",
                      description: error instanceof Error ? error.message : "Please try again.",
                    });
                  }
                }}
              />
            ) : null}
          </div>
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col overflow-hidden">
        {listLoading && pageLeads.length === 0 ? (
          <StatCardsSkeleton className="shrink-0 gap-4" />
        ) : (
          <div className="mb-4 grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total leads</p>
                <p className="mt-1 font-display text-xl font-semibold">{listStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Repeat inquiries</p>
                <p className="mt-1 font-display text-xl font-semibold text-signal">
                  {listStats.repeat}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Booked</p>
                <p className="mt-1 font-display text-xl font-semibold text-teal">
                  {listStats.booked}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Open</p>
                <p className="mt-1 font-display text-xl font-semibold">
                  {listStats.open}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-col gap-3 border-b border-border-soft bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-soft" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, phone, email…"
                  className="h-8 pl-8 text-xs"
                  type="search"
                  name="leads-list-search"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  readOnly={!searchUnlocked}
                  onFocus={() => setSearchUnlocked(true)}
                />
              </div>
              <MultiFilter
                label="Website"
                options={websiteDomains}
                selected={websiteFilter}
                onChange={setWebsiteFilter}
                emptyText={leadsLoading ? "Loading websites…" : "No websites"}
                formatOption={(domain) => {
                  const w = websites.find((item) => item.domain === domain);
                  return w ? `${w.label} · ${w.domain}` : domain;
                }}
              />
              <MultiFilter
                label="Status"
                options={statusCodes}
                selected={statusFilter}
                onChange={setStatusFilter}
                emptyText={leadsLoading ? "Loading statuses…" : "No statuses"}
                formatOption={(code) => leadStatuses.find((s) => s.code === code)?.label ?? code}
              />
              <MultiFilter
                label="Source"
                options={sourceCodes}
                selected={sourceFilter}
                onChange={setSourceFilter}
                emptyText={leadsLoading ? "Loading sources…" : "No sources"}
                formatOption={(code) => sourceLabel(code, leadSources)}
              />
              <MultiFilter
                label="Agent"
                options={agentOptions}
                selected={agentFilter}
                onChange={setAgentFilter}
                emptyText={leadsLoading ? "Loading agents…" : "No agents"}
                formatOption={(id) =>
                  id === "unassigned"
                    ? "Unassigned"
                    : assignees.find((a) => a.id === id)?.name ?? id
                }
              />
              <DateRangeFilter
                value={createdRange}
                onChange={setCreatedRange}
                align="start"
                emptyLabel="Created on"
                className="h-8 sm:min-w-[10.5rem]"
              />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-slate"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter([]);
                    setSourceFilter([]);
                    setAgentFilter([]);
                    setWebsiteFilter([]);
                    setCreatedRange(null);
                  }}
                >
                  <X className="size-3.5" /> Clear filters
                </Button>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canExportLeads ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={exporting || listLoading}
                  onClick={() => setExportOpen(true)}
                >
                  <Download className="size-3.5" />
                  Export CSV
                </Button>
              ) : null}
            </div>
          </div>

          <div className="relative hidden min-h-0 flex-1 md:block">
            <CrmGrid<Lead>
              className="h-full min-h-[28rem]"
              columnDefs={columnDefs}
              fetchPage={fetchGridPage}
              toolbarKey={filterKey}
              storageKey="crm.ag.leads.v1"
              context={gridActions}
              onGridApi={(api) => {
                gridApiRef.current = api;
              }}
              onError={(error) => {
                toast({
                  variant: "error",
                  title: "Could not load leads",
                  description: error instanceof Error ? error.message : "Please try again.",
                });
              }}
              onStats={({ total, extra }) => {
                const stats = (extra as { total?: number; booked?: number; open?: number; repeat?: number } | undefined);
                if (stats && typeof stats.total === "number") {
                  setListStats({
                    total: stats.total,
                    booked: stats.booked ?? 0,
                    open: stats.open ?? 0,
                    repeat: stats.repeat ?? 0,
                  });
                } else {
                  setListStats((prev) => ({ ...prev, total }));
                }
                setListLoading(false);
              }}
              extractExtra={(result) => (result as { stats?: unknown }).stats}
            />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:hidden">
            {listLoading && visible.length === 0 ? (
              <RecordCardsSkeleton count={4} />
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No leads match these filters.
              </p>
            ) : (
              visible.map((l) => {
                const attribution = leadAttribution(l);
                return (
                <RecordCard key={l.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-base font-semibold break-words text-ink-text">{l.name}</p>
                        {l.inquiryCount > 1 ? <Copy className="size-3.5 shrink-0 text-signal" /> : null}
                      </div>
                      <p className="font-mono-data text-[11px] text-slate-soft">{l.leadNo}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="inline-flex items-center gap-1">
                          <StatusBadge status={l.status} />
                          <ChevronDown className="size-3.5 text-slate-soft" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Set status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {leadStatuses.map((s) => (
                          <DropdownMenuItem
                            key={s.code}
                            disabled={s.code === l.status}
                            onSelect={() => {
                              handleLeadStatusChange(l, s.code, s.label);
                            }}
                          >
                            <StatusBadge status={s.code} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <InfoGrid>
                    <InfoItem label="Phone">{l.phone || "—"}</InfoItem>
                    <InfoItem label="Email">{l.email || "—"}</InfoItem>
                    <InfoItem label="Tour package" className="sm:col-span-2">
                      {l.tourPackage || "—"}
                    </InfoItem>
                    <InfoItem label="Route" className="sm:col-span-2">
                      {l.pickup}
                      {l.drop ? ` → ${l.drop}` : ""}
                    </InfoItem>
                    <InfoItem label="Travel dates">
                      {formatDisplayDate(l.pickupDate)}
                      {l.dropDate ? ` → ${formatDisplayDate(l.dropDate)}` : ""}
                    </InfoItem>
                    <InfoItem label="Car / pax / days">
                      {l.car || "—"} · {l.adults}A{l.kids > 0 ? `+${l.kids}K` : ""} · {l.days}d
                    </InfoItem>
                    <InfoItem label="Source">
                      {sourceLabel(attribution.source, leadSources)}
                      {attribution.website ? ` · ${attribution.website}` : ""}
                    </InfoItem>
                    <InfoItem label="UTM URL" className="sm:col-span-2">
                      {l.pageUrl ? (
                        <a
                          href={l.pageUrl.startsWith("http") ? l.pageUrl : `https://${l.pageUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={l.pageUrl}
                          className="break-all text-marigold hover:underline"
                        >
                          {l.pageUrl}
                        </a>
                      ) : (
                        "—"
                      )}
                    </InfoItem>
                    <InfoItem label="Assigned">{l.assignedTo?.name || "Unassigned"}</InfoItem>
                    <InfoItem label="Created">
                      <CreatedAtDisplay iso={l.createdAt} />
                    </InfoItem>
                    <InfoItem label="Next follow-up">
                      {formatNextFollowUp(l.nextFollowUpDate, l.nextFollowUpTime)}
                    </InfoItem>
                    <InfoItem label="Price">₹{l.price.toLocaleString("en-IN")}</InfoItem>
                    <InfoItem label="Last inquiry">{formatRelativeTime(l.lastInquiryAt)}</InfoItem>
                  </InfoGrid>
                  <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                    <Button size="sm" variant="outline" onClick={() => setHistoryLeadId(l.id)}>
                      <History className="size-3.5" /> History
                    </Button>
                    {canCommentLead ? (
                    <Button size="sm" variant="outline" onClick={() => setCommentLeadId(l.id)}>
                      <MessageCircle className="size-3.5" /> Comments
                    </Button>
                    ) : null}
                    {canQuoteLead ? (
                    <Button size="sm" variant="outline" onClick={() => setQuoteLeadId(l.id)}>
                      <FileText className="size-3.5" /> Quote
                    </Button>
                    ) : null}
                    {leadCanConvertToBooking(l) ? (
                      <Button size="sm" variant="outline" onClick={() => setBookingLead(l)}>
                        <CalendarPlus className="size-3.5" /> Create booking
                      </Button>
                    ) : null}
                    {canEditLead ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingLeadId(l.id)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    ) : null}
                    {canDeleteLead ? (
                    <Button size="sm" variant="outline" className="text-signal" onClick={() => setDeleteTarget(l)}>
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                    ) : null}
                  </div>
                </RecordCard>
                );
              })
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

      <LeadFormDialog
        lead={editingLead ?? undefined}
        open={!!editingLead}
        onOpenChange={(open) => {
          if (!open) setEditingLeadId(null);
        }}
        onSubmit={async (data) => {
          if (!editingLead) return;
          try {
            await updateLead(editingLead.id, {
              ...data,
              assignedToId: data.assignedToId,
            });
            toast({
              variant: "success",
              title: "Lead updated",
              description: `${editingLead.leadNo} saved successfully.`,
            });
            setEditingLeadId(null);
            void reloadLeads();
          } catch (error) {
            toast({
              variant: "error",
              title: "Could not update lead",
              description: error instanceof Error ? error.message : "Please try again.",
            });
            throw error;
          }
        }}
      />

      <LeadCommentsDrawer
        lead={commentLead}
        open={!!commentLeadId}
        loading={commentsLoading}
        onOpenChange={(v) => !v && setCommentLeadId(null)}
        onAddComment={async (leadId, text) => {
          await addLeadComment(leadId, text);
          toast({
            variant: "success",
            title: "Comment added",
            description: `Note saved on ${commentLead?.name ?? "lead"}.`,
          });
        }}
      />

      <LeadHistoryDrawer
        lead={historyLead}
        open={!!historyLeadId}
        loading={historyLoading}
        onOpenChange={(v) => !v && setHistoryLeadId(null)}
      />

      <LeadQuoteDrawer
        lead={quoteLead}
        itineraries={state.itineraries}
        open={!!quoteLeadId}
        onOpenChange={(v) => !v && setQuoteLeadId(null)}
        onSent={() => {
          void reloadLeads();
          if (quoteLeadId) void loadLeadActivity(quoteLeadId);
        }}
      />

      <BookingFormDialog
        lead={bookingLead ?? undefined}
        drivers={state.drivers}
        open={!!bookingLead}
        onOpenChange={(open) => {
          if (!open) setBookingLead(null);
        }}
        onSubmit={handleCreateBookingFromLead}
      />

      <LeadsExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        initialFilters={exportInitialFilters}
        statusOptions={statusCodes}
        sourceOptions={sourceCodes}
        websiteOptions={websiteDomains}
        agentOptions={agentOptions}
        formatStatus={(code) => leadStatuses.find((s) => s.code === code)?.label ?? code}
        formatSource={(code) => sourceLabel(code, leadSources)}
        formatWebsite={(domain) => {
          const w = websites.find((item) => item.domain === domain);
          return w ? `${w.label} · ${w.domain}` : domain;
        }}
        formatAgent={(id) =>
          id === "unassigned" ? "Unassigned" : assignees.find((a) => a.id === id)?.name ?? id
        }
        hideAgentFilter={isEmployee}
        exporting={exporting}
        onExport={async (query) => {
          setExporting(true);
          try {
            return await downloadLeadsCsv(query);
          } finally {
            setExporting(false);
          }
        }}
        onSuccess={(count, filtered) => {
          toast({
            variant: "success",
            title: count === 0 ? "Exported headers only" : "Export ready",
            description:
              count === 0
                ? "No leads matched your export filters."
                : `Exported ${count} lead${count === 1 ? "" : "s"}${filtered ? " (filtered)" : ""}.`,
          });
        }}
        onError={(message) => {
          toast({
            variant: "error",
            title: "Could not export leads",
            description: message,
          });
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this lead?"
        description={`${deleteTarget?.name ?? ""} (${deleteTarget?.leadNo ?? ""}) will be permanently removed from the pipeline.`}
        onConfirm={() => {
          if (!deleteTarget) return;
          void deleteLead(deleteTarget.id).then(() => {
            toast({ variant: "info", title: "Lead deleted", description: `${deleteTarget.name} was removed.` });
            void reloadLeads();
          });
        }}
      />
    </>
  );
}
