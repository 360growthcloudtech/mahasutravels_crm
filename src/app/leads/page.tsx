"use client";

import * as React from "react";
import {
  ChevronDown,
  Copy,
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
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Lead } from "@/lib/data";
import { formatRelativeTime, sourceLabel } from "@/lib/lead-utils";
import { formatDisplayDate } from "@/components/crm/date-picker";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";

const stickyActionHead =
  "sticky right-0 top-0 z-30 min-w-[10.5rem] whitespace-nowrap border-l border-border-soft bg-card";
const stickyActionCell =
  "relative sticky right-0 z-20 min-w-[10.5rem] border-l border-border-soft bg-card before:absolute before:inset-0 before:-z-10 before:bg-card before:content-[''] group-hover:bg-secondary group-hover:before:bg-secondary";

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function MultiFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
  formatOption,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  formatOption?: (value: T) => string;
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
      <DropdownMenuContent align="start" className="min-w-[11rem]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.includes(option)}
            onCheckedChange={() => onChange(toggleValue(selected, option))}
            onSelect={(e) => e.preventDefault()}
          >
            {formatOption ? formatOption(option) : option}
          </DropdownMenuCheckboxItem>
        ))}
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
    addLead,
    updateLead,
    deleteLead,
    addQuote,
    assignLeadItinerary,
    updateLeadCustomItinerary,
    resetLeadItinerary,
    addLeadComment,
    loadLeadComments,
    loadLeadActivity,
  } = useData();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = React.useState<string[]>([]);
  const [agentFilter, setAgentFilter] = React.useState<string[]>([]);
  const [websiteFilter, setWebsiteFilter] = React.useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = React.useState<Lead | null>(null);
  const [commentLeadId, setCommentLeadId] = React.useState<string | null>(null);
  const [historyLeadId, setHistoryLeadId] = React.useState<string | null>(null);
  const [quoteLeadId, setQuoteLeadId] = React.useState<string | null>(null);

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
    if (commentLeadId) void loadLeadComments(commentLeadId);
  }, [commentLeadId, loadLeadComments]);

  React.useEffect(() => {
    if (historyLeadId) void loadLeadActivity(historyLeadId);
  }, [historyLeadId, loadLeadActivity]);

  const assigneeNames = ["Unassigned", ...assignees.map((a) => a.name)];
  const statusCodes = leadStatuses.map((s) => s.code);
  const sourceCodes = leadSources.map((s) => s.code);
  const websiteDomains = websites.map((w) => w.domain);
  const closedStatusCodes = new Set(leadStatuses.filter((s) => s.is_closed).map((s) => s.code));
  const confirmedCount = state.leads.filter((l) => l.status === "Confirmed").length;

  const hasFilters =
    query.trim().length > 0 ||
    statusFilter.length > 0 ||
    sourceFilter.length > 0 ||
    agentFilter.length > 0 ||
    websiteFilter.length > 0;

  const visible = state.leads.filter((l) => {
    const q = query.trim().toLowerCase();
    if (q) {
      const matchesName = l.name.toLowerCase().includes(q);
      const matchesEmail = l.email.toLowerCase().includes(q);
      const matchesPhone = l.phone.toLowerCase().includes(q) || l.leadNo.toLowerCase().includes(q);
      if (!matchesName && !matchesEmail && !matchesPhone) return false;
    }
    if (statusFilter.length > 0 && !statusFilter.includes(l.status)) return false;
    if (sourceFilter.length > 0 && !sourceFilter.includes(l.source)) return false;
    if (agentFilter.length > 0) {
      const agentName = l.assignedTo?.name || "Unassigned";
      if (!agentFilter.includes(agentName)) return false;
    }
    if (websiteFilter.length > 0 && (!l.website || !websiteFilter.includes(l.website))) return false;
    return true;
  });

  const repeatCount = state.leads.filter((l) => l.inquiryCount > 1 || l.previousLeadId).length;

  return (
    <Shell>
      <Topbar
        title="Leads"
        action={
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
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col overflow-hidden">
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
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="mt-1 font-display text-xl font-semibold text-teal">
                {confirmedCount}
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
                />
              </div>
              <MultiFilter
                label="Website"
                options={websiteDomains}
                selected={websiteFilter}
                onChange={setWebsiteFilter}
              />
              <MultiFilter
                label="Status"
                options={statusCodes}
                selected={statusFilter}
                onChange={setStatusFilter}
                formatOption={(code) => leadStatuses.find((s) => s.code === code)?.label ?? code}
              />
              <MultiFilter
                label="Source"
                options={sourceCodes}
                selected={sourceFilter}
                onChange={setSourceFilter}
                formatOption={(code) => sourceLabel(code, leadSources)}
              />
              <MultiFilter
                label="Agent"
                options={assigneeNames}
                selected={agentFilter}
                onChange={setAgentFilter}
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
          </div>

          <div className="hidden min-h-0 flex-1 md:block">
          <Table containerClassName="min-h-0 flex-1 overflow-auto">
            <TableHeader>
              <TableRow className="group hover:bg-transparent">
                <TableHead className="sticky top-0 z-20 bg-card">Lead</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Tour package / Route</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Travel dates</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Car / pax / days</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Source</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Assigned</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Status</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right whitespace-nowrap">Price</TableHead>
                <TableHead className={`text-right ${stickyActionHead}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((l) => (
                <TableRow key={l.id} className="group">
                  <TableCell>
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
                  <TableCell className="min-w-0">
                    <p className="truncate text-sm text-ink-text">{l.tourPackage || "—"}</p>
                    <p className="truncate text-[11px] text-slate-soft">
                      {l.pickup}{l.drop ? ` → ${l.drop}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-slate">
                    <p>{formatDisplayDate(l.pickupDate)}</p>
                    {l.dropDate ? (
                      <p className="text-[11px] text-slate-soft">to {formatDisplayDate(l.dropDate)}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-slate">
                    {l.car || "—"}{" "}
                    <span className="text-slate-soft">
                      · {l.adults}A{l.kids > 0 ? `+${l.kids}K` : ""} · {l.days}d
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <Badge variant="outline" className="font-normal">{sourceLabel(l.source, leadSources)}</Badge>
                      {l.website && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {l.website}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate">{l.assignedTo?.name || "Unassigned"}</TableCell>
                  <TableCell>
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
                              void updateLead(l.id, { status: s.code })
                                .then(() =>
                                  toast({
                                    variant: "success",
                                    title: "Status updated",
                                    description: `${l.name} moved to ${s.label}.`,
                                  })
                                )
                                .catch((error) =>
                                  toast({
                                    variant: "error",
                                    title: "Could not update status",
                                    description: error instanceof Error ? error.message : "Please try again.",
                                  })
                                );
                            }}
                          >
                            <StatusBadge status={s.code} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="whitespace-nowrap pr-6 text-right font-mono-data text-sm text-ink-text">
                    ₹{l.price.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className={stickyActionCell}>
                    <div className="relative z-10 flex items-center justify-end gap-1 bg-inherit">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Tracking history for ${l.name}`}
                        onClick={() => setHistoryLeadId(l.id)}
                      >
                        <History className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Comments for ${l.name}`}
                        onClick={() => setCommentLeadId(l.id)}
                      >
                        <MessageCircle className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Send quote for ${l.name}`}
                        onClick={() => setQuoteLeadId(l.id)}
                      >
                        <FileText className="size-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <LeadFormDialog
                            lead={l}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Pencil className="size-3.5" /> Edit lead
                              </DropdownMenuItem>
                            }
                            onSubmit={async (data) => {
                              try {
                                await updateLead(l.id, {
                                  ...data,
                                  assignedToId: data.assignedToId,
                                });
                                toast({ variant: "success", title: "Lead updated", description: `${l.leadNo} saved successfully.` });
                              } catch (error) {
                                toast({
                                  variant: "error",
                                  title: "Could not update lead",
                                  description: error instanceof Error ? error.message : "Please try again.",
                                });
                              }
                            }}
                          />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-signal focus:bg-signal-soft"
                            onSelect={(e) => {
                              e.preventDefault();
                              setDeleteTarget(l);
                            }}
                          >
                            <Trash2 className="size-3.5" /> Delete lead
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    {leadsLoading ? "Loading leads…" : "No leads match these filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:hidden">
            {visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {leadsLoading ? "Loading leads…" : "No leads match these filters."}
              </p>
            ) : (
              visible.map((l) => (
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
                              void updateLead(l.id, { status: s.code }).then(() =>
                                toast({
                                  variant: "success",
                                  title: "Status updated",
                                  description: `${l.name} moved to ${s.label}.`,
                                })
                              );
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
                      {sourceLabel(l.source, leadSources)}
                      {l.website ? ` · ${l.website}` : ""}
                    </InfoItem>
                    <InfoItem label="Assigned">{l.assignedTo?.name || "Unassigned"}</InfoItem>
                    <InfoItem label="Price">₹{l.price.toLocaleString("en-IN")}</InfoItem>
                    <InfoItem label="Last inquiry">{formatRelativeTime(l.lastInquiryAt)}</InfoItem>
                  </InfoGrid>
                  <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                    <Button size="sm" variant="outline" onClick={() => setHistoryLeadId(l.id)}>
                      <History className="size-3.5" /> History
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCommentLeadId(l.id)}>
                      <MessageCircle className="size-3.5" /> Comments
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setQuoteLeadId(l.id)}>
                      <FileText className="size-3.5" /> Quote
                    </Button>
                    <LeadFormDialog
                      lead={l}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                      }
                      onSubmit={async (data) => {
                        await updateLead(l.id, { ...data, assignedToId: data.assignedToId });
                        toast({ variant: "success", title: "Lead updated", description: `${l.leadNo} saved successfully.` });
                      }}
                    />
                    <Button size="sm" variant="outline" className="text-signal" onClick={() => setDeleteTarget(l)}>
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </div>
                </RecordCard>
              ))
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-border-soft bg-card px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <span>Showing {visible.length} of {state.leads.length} leads</span>
          </div>
        </Card>
      </main>

      <LeadCommentsDrawer
        lead={commentLead}
        open={!!commentLeadId}
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
        onOpenChange={(v) => !v && setHistoryLeadId(null)}
      />

      <LeadQuoteDrawer
        lead={quoteLead}
        quotes={state.quotes}
        itineraries={state.itineraries}
        open={!!quoteLeadId}
        onOpenChange={(v) => !v && setQuoteLeadId(null)}
        onAssignItinerary={(templateId) => {
          if (!quoteLead) return;
          assignLeadItinerary(quoteLead.id, templateId);
          toast({
            variant: "success",
            title: "Template assigned",
            description: "Master itinerary linked. Guest copy cleared if any.",
          });
        }}
        onSaveCustomItinerary={(custom) => {
          if (!quoteLead) return;
          updateLeadCustomItinerary(quoteLead.id, custom);
          toast({
            variant: "success",
            title: "Guest itinerary saved",
            description: "Master template was not changed.",
          });
        }}
        onResetItinerary={() => {
          if (!quoteLead) return;
          resetLeadItinerary(quoteLead.id);
          toast({
            variant: "info",
            title: "Reset to template",
            description: "Guest copy cleared.",
          });
        }}
        onSend={({ amount, note, sentVia, saveAsDraft }) => {
          if (!quoteLead) return;
          const route =
            quoteLead.pickup && quoteLead.drop
              ? `${quoteLead.pickup} → ${quoteLead.drop}`
              : quoteLead.tourPackage;
          addQuote({
            leadId: quoteLead.id,
            customer: quoteLead.name,
            route,
            days: quoteLead.days,
            cabType: quoteLead.car,
            amount,
            stage: saveAsDraft ? "Draft" : "Sent",
            sentVia,
            note: note || undefined,
          });
          void updateLead(quoteLead.id, {
            status: saveAsDraft ? quoteLead.status : "Quoted",
            price: amount,
            notes: note || quoteLead.notes,
          });
          setQuoteLeadId(null);
          toast({
            variant: "success",
            title: saveAsDraft ? "Quote draft saved" : "Quote sent",
            description: saveAsDraft
              ? `Draft quote linked to ${quoteLead.name}.`
              : `Quote for ${quoteLead.name} sent via ${sentVia.join(", ")}.`,
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
    </Shell>
  );
}
