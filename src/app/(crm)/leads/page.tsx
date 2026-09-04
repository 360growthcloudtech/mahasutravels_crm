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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { TableColumnsMenu } from "@/components/crm/table-columns-menu";
import { ResizableTableHead } from "@/components/crm/resizable-table-head";
import { useTableColumnLayout, type TableColumnDef } from "@/lib/use-table-column-layout";
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
import { downloadLeadsCsv } from "@/lib/leads-api";
import { LeadsExportDialog } from "@/components/crm/leads-export-dialog";
import { useSession } from "@/lib/session-context";
import { useHasPermission } from "@/lib/use-has-permission";
import { formatDisplayDate } from "@/components/crm/date-picker";
import {
  RecordCardsSkeleton,
  StatCardsSkeleton,
  TableRowsSkeleton,
} from "@/components/crm/skeletons";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import { CreatedAtDisplay } from "@/components/crm/created-at-display";

function formatNextFollowUp(date?: string, time?: string) {
  if (!date) return "—";
  const datePart = formatDisplayDate(date);
  const timePart = formatDisplayTime(time);
  return timePart ? `${datePart} · ${timePart}` : datePart;
}

const stickyActionHead =
  "sticky right-0 top-0 z-30 min-w-[10.5rem] whitespace-nowrap border-l border-border-soft bg-card";
const stickyActionCell =
  "relative sticky right-0 z-20 min-w-[10.5rem] border-l border-border-soft bg-card before:absolute before:inset-0 before:-z-10 before:bg-card before:content-[''] group-hover:bg-secondary group-hover:before:bg-secondary";

const LEAD_TABLE_COLUMNS: TableColumnDef[] = [
  { id: "lead", label: "Lead", locked: true, defaultWidth: 220 },
  { id: "tour", label: "Tour package / Route", defaultWidth: 200 },
  { id: "status", label: "Status", defaultWidth: 120 },
  { id: "travel", label: "Travel dates", defaultWidth: 150 },
  { id: "car", label: "Car / pax / days", defaultWidth: 150 },
  { id: "source", label: "Source", defaultWidth: 140 },
  { id: "assigned", label: "Assigned", defaultWidth: 130 },
  { id: "created", label: "Created", defaultWidth: 120 },
  { id: "followup", label: "Next follow-up", defaultWidth: 150 },
  { id: "price", label: "Price", align: "right", defaultWidth: 110 },
  { id: "utm", label: "UTM URL", defaultWidth: 180 },
  { id: "actions", label: "Actions", locked: true, align: "right", defaultWidth: 176 },
];

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
  const [searchUnlocked, setSearchUnlocked] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = React.useState<string[]>([]);
  /** Agent filter stores assignee user ids, plus `"unassigned"`. */
  const [agentFilter, setAgentFilter] = React.useState<string[]>([]);
  const [websiteFilter, setWebsiteFilter] = React.useState<string[]>([]);
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
  const columnLayout = useTableColumnLayout("crm.table.leads.v2", LEAD_TABLE_COLUMNS);

  const editingLead = editingLeadId
    ? state.leads.find((l) => l.id === editingLeadId) ?? null
    : null;

  const bookedLeadIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const b of state.bookings) {
      if (b.leadId) ids.add(b.leadId);
    }
    return ids;
  }, [state.bookings]);

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
      .then(() =>
        toast({
          variant: "success",
          title: "Status updated",
          description: `${lead.name} moved to ${label}.`,
        })
      )
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
    ? state.leads.find((l) => l.id === commentLeadId) ?? null
    : null;
  const historyLead = historyLeadId
    ? state.leads.find((l) => l.id === historyLeadId) ?? null
    : null;
  const quoteLead = quoteLeadId
    ? state.leads.find((l) => l.id === quoteLeadId) ?? null
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
  const closedStatusCodes = new Set(leadStatuses.filter((s) => s.is_closed).map((s) => s.code));
  const bookedCount = state.leads.filter((l) => l.status === "Booked").length;

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
    query.trim().length > 0 ||
    statusFilter.length > 0 ||
    sourceFilter.length > 0 ||
    agentFilter.length > 0 ||
    websiteFilter.length > 0;

  const exportInitialFilters = React.useMemo(
    () => ({
      search: query,
      status: statusFilter,
      source: sourceFilter,
      website: websiteFilter,
      assigned_to: agentFilter,
    }),
    [query, statusFilter, sourceFilter, websiteFilter, agentFilter]
  );

  const visible = state.leads.filter((l) => {
    const q = query.trim().toLowerCase();
    if (q) {
      const matchesName = l.name.toLowerCase().includes(q);
      const matchesEmail = l.email.toLowerCase().includes(q);
      const matchesPhone = l.phone.toLowerCase().includes(q) || l.leadNo.toLowerCase().includes(q);
      if (!matchesName && !matchesEmail && !matchesPhone) return false;
    }
    const attribution = leadAttribution(l);
    if (statusFilter.length > 0 && !statusFilter.includes(l.status)) return false;
    if (sourceFilter.length > 0 && !sourceFilter.includes(attribution.source)) return false;
    if (agentFilter.length > 0) {
      const agentId = l.assignedTo?.id || "unassigned";
      if (!agentFilter.includes(agentId)) return false;
    }
    if (websiteFilter.length > 0 && (!attribution.website || !websiteFilter.includes(attribution.website))) {
      return false;
    }
    return true;
  });

  const repeatCount = state.leads.filter((l) => l.inquiryCount > 1 || l.previousLeadId).length;

  return (
    <>
      <Topbar
        title="Leads"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TableRefreshButton onRefresh={refreshLeads} loading={leadsLoading} />
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
        {leadsLoading ? (
          <StatCardsSkeleton className="shrink-0 gap-4" />
        ) : (
          <div className="mb-4 grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total leads</p>
                <p className="mt-1 font-display text-xl font-semibold">{state.leads.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Repeat inquiries</p>
                <p className="mt-1 font-display text-xl font-semibold text-signal">
                  {repeatCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Booked</p>
                <p className="mt-1 font-display text-xl font-semibold text-teal">
                  {bookedCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Open</p>
                <p className="mt-1 font-display text-xl font-semibold">
                  {state.leads.filter((l) => !closedStatusCodes.has(l.status)).length}
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
                  disabled={exporting || leadsLoading}
                  onClick={() => setExportOpen(true)}
                >
                  <Download className="size-3.5" />
                  Export CSV
                </Button>
              ) : null}
              <TableColumnsMenu
                columns={columnLayout.columns}
                isHidden={columnLayout.isHidden}
                onToggle={columnLayout.toggle}
                onReset={columnLayout.reset}
                isDirty={columnLayout.isDirty}
              />
            </div>
          </div>

          <div className="hidden min-h-0 flex-1 md:block">
          <Table containerClassName="min-h-0 flex-1 overflow-auto" className="table-fixed min-w-max">
            <TableHeader>
              <TableRow className="group hover:bg-transparent">
                {columnLayout.visibleIds.map((id) => {
                  const def = LEAD_TABLE_COLUMNS.find((column) => column.id === id);
                  if (!def) return null;
                  return (
                    <ResizableTableHead
                      key={id}
                      id={id}
                      label={def.label}
                      width={columnLayout.widthFor(id)}
                      locked={def.locked}
                      align={def.align}
                      className={id === "actions" ? stickyActionHead : undefined}
                      onMove={columnLayout.move}
                      onResize={columnLayout.setWidth}
                    />
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsLoading ? (
                <TableRowsSkeleton columns={columnLayout.visibleIds.length} rows={6} avatar />
              ) : visible.map((l) => {
                const attribution = leadAttribution(l);
                return (
                <TableRow key={l.id} className="group">
                  {columnLayout.visibleIds.map((columnId) => {
                    const width = columnLayout.widthFor(columnId);
                    const cellStyle = { width, minWidth: width, maxWidth: width };
                    if (columnId === "lead") {
                      return (
                  <TableCell key={columnId} style={cellStyle}>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-ink-text">
                        {l.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-ink-text">{l.name}</p>
                          {l.inquiryCount > 1 && (
                            <span title={`Repeat inquiry · ${l.inquiryCount} times`}>
                              <Copy className="size-3 text-signal" />
                            </span>
                          )}
                        </div>
                        <p className="font-mono-data text-[11px] text-slate-soft">
                          {l.leadNo} · {l.phone}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                      );
                    }
                    if (columnId === "tour") {
                      return (
                  <TableCell key={columnId} className="min-w-0" style={cellStyle}>
                    <p className="truncate text-sm text-ink-text">{l.tourPackage || "—"}</p>
                    <p className="truncate text-[11px] text-slate-soft">
                      {l.pickup}{l.drop ? ` → ${l.drop}` : ""}
                    </p>
                  </TableCell>
                      );
                    }
                    if (columnId === "status") {
                      return (
                  <TableCell key={columnId} style={cellStyle}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-1"
                          aria-label={`Change status for ${l.name}`}
                        >
                          <StatusBadge status={l.status} />
                          <ChevronDown className="size-3.5 text-slate-soft" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
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
                  </TableCell>
                      );
                    }
                    if (columnId === "travel") {
                      return (
                  <TableCell key={columnId} className="text-sm text-slate" style={cellStyle}>
                    <p>{formatDisplayDate(l.pickupDate)}</p>
                    {l.dropDate ? (
                      <p className="text-[11px] text-slate-soft">to {formatDisplayDate(l.dropDate)}</p>
                    ) : null}
                  </TableCell>
                      );
                    }
                    if (columnId === "car") {
                      return (
                  <TableCell key={columnId} className="text-sm text-slate" style={cellStyle}>
                    {l.car || "—"}{" "}
                    <span className="text-slate-soft">
                      · {l.adults}A{l.kids > 0 ? `+${l.kids}K` : ""} · {l.days}d
                    </span>
                  </TableCell>
                      );
                    }
                    if (columnId === "source") {
                      return (
                  <TableCell key={columnId} style={cellStyle}>
                    <div className="space-y-0.5">
                      <Badge variant="outline" className="font-normal">
                        {sourceLabel(attribution.source, leadSources)}
                      </Badge>
                      {attribution.website && (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {attribution.website}
                        </p>
                      )}
                    </div>
                  </TableCell>
                      );
                    }
                    if (columnId === "utm") {
                      return (
                  <TableCell key={columnId} style={cellStyle}>
                    {l.pageUrl ? (
                      <a
                        href={l.pageUrl.startsWith("http") ? l.pageUrl : `https://${l.pageUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={l.pageUrl}
                        className="block truncate text-sm text-marigold hover:underline"
                      >
                        {l.pageUrl}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-soft">—</span>
                    )}
                  </TableCell>
                      );
                    }
                    if (columnId === "assigned") {
                      return (
                  <TableCell key={columnId} className="text-sm text-slate" style={cellStyle}>
                    {l.assignedTo?.name || "Unassigned"}
                  </TableCell>
                      );
                    }
                    if (columnId === "created") {
                      return (
                  <TableCell key={columnId} className="whitespace-nowrap text-sm text-slate" style={cellStyle}>
                    <CreatedAtDisplay iso={l.createdAt} stacked />
                  </TableCell>
                      );
                    }
                    if (columnId === "followup") {
                      return (
                  <TableCell key={columnId} className="whitespace-nowrap text-sm text-slate" style={cellStyle}>
                    {formatNextFollowUp(l.nextFollowUpDate, l.nextFollowUpTime)}
                  </TableCell>
                      );
                    }
                    if (columnId === "price") {
                      return (
                  <TableCell key={columnId} className="whitespace-nowrap text-right font-mono-data text-sm text-ink-text" style={cellStyle}>
                    ₹{l.price.toLocaleString("en-IN")}
                  </TableCell>
                      );
                    }
                    if (columnId === "actions") {
                      return (
                  <TableCell key={columnId} className={stickyActionCell} style={cellStyle}>
                    <TooltipProvider delayDuration={200}>
                      <div className="relative z-10 flex items-center justify-end gap-1 bg-inherit">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={`Tracking history for ${l.name}`}
                              onClick={() => setHistoryLeadId(l.id)}
                            >
                              <History className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">History</TooltipContent>
                        </Tooltip>
                        {canCommentLead ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={`Comments for ${l.name}`}
                              onClick={() => setCommentLeadId(l.id)}
                            >
                              <MessageCircle className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Comments</TooltipContent>
                        </Tooltip>
                        ) : null}
                        {canQuoteLead ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              aria-label={`Send quote for ${l.name}`}
                              onClick={() => setQuoteLeadId(l.id)}
                            >
                              <FileText className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Send quote</TooltipContent>
                        </Tooltip>
                        ) : null}
                        {leadCanConvertToBooking(l) ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                aria-label={`Create booking for ${l.name}`}
                                onClick={() => setBookingLead(l)}
                              >
                                <CalendarPlus className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Create booking</TooltipContent>
                          </Tooltip>
                        ) : null}
                        {canEditLead || canDeleteLead ? (
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
                                  {canEditLead ? (
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setEditingLeadId(l.id);
                                    }}
                                  >
                                    <Pencil className="size-3.5" /> Edit lead
                                  </DropdownMenuItem>
                                  ) : null}
                                  {canEditLead && canDeleteLead ? <DropdownMenuSeparator /> : null}
                                  {canDeleteLead ? (
                                  <DropdownMenuItem
                                    className="text-signal focus:bg-signal-soft"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setDeleteTarget(l);
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
                  </TableCell>
                      );
                    }
                    return null;
                  })}
                </TableRow>
                );
              })}
              {!leadsLoading && visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnLayout.visibleIds.length} className="py-10 text-center text-sm text-muted-foreground">
                    No leads match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:hidden">
            {leadsLoading ? (
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
          <div className="flex shrink-0 items-center justify-between border-t border-border-soft bg-card px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <span>Showing {visible.length} of {state.leads.length} leads</span>
          </div>
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
          void refreshLeads();
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
          });
        }}
      />
    </>
  );
}
