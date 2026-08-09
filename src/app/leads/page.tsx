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
import { agents, Lead, LeadStatus, makeLeadHistoryEvent, trackedWebsites } from "@/lib/data";
import { formatDisplayDate } from "@/components/crm/date-picker";

const statuses: LeadStatus[] = ["New", "Contacted", "Quoted", "Follow-up", "Confirmed", "Lost"];
const sources: Lead["source"][] = ["Website", "Google Ads", "Meta Ads", "Manual"];
const agentNames = agents.map((a) => a.name);
const websiteNames = trackedWebsites.map((w) => w.name);

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
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
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
            {option}
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
  const { state, addLead, updateLead, deleteLead, addQuote, assignLeadItinerary, updateLeadCustomItinerary, resetLeadItinerary } = useData();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<LeadStatus[]>([]);
  const [sourceFilter, setSourceFilter] = React.useState<Lead["source"][]>([]);
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

  function track(
    lead: Lead,
    action: Parameters<typeof makeLeadHistoryEvent>[0],
    label: string,
    detail?: string
  ) {
    return [...(lead.history ?? []), makeLeadHistoryEvent(action, label, { detail })];
  }

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
      if (!matchesName && !matchesEmail) return false;
    }
    if (statusFilter.length > 0 && !statusFilter.includes(l.status)) return false;
    if (sourceFilter.length > 0 && !sourceFilter.includes(l.source)) return false;
    if (agentFilter.length > 0 && !agentFilter.includes(l.agent)) return false;
    if (websiteFilter.length > 0 && (!l.website || !websiteFilter.includes(l.website))) return false;
    return true;
  });

  return (
    <Shell>
      <Topbar
        eyebrow="Module 1–3 · Capture, dedupe, assignment"
        title="Leads"
        action={
          <LeadFormDialog
            trigger={
              <Button variant="marigold">
                <Plus className="size-4" /> Add Lead
              </Button>
            }
            onSubmit={(data) => {
              addLead({
                ...data,
                history: [
                  makeLeadHistoryEvent("created", "Lead created", {
                    detail: `Source: ${data.source} · Dummy entry`,
                  }),
                  makeLeadHistoryEvent("assigned", `Assigned to ${data.agent}`, {
                    detail: "Manual assignment on create",
                  }),
                ],
              });
              toast({ variant: "success", title: "Lead added", description: `${data.name} was added to the pipeline.` });
            }}
          />
        }
      />

      <main className="flex h-[calc(100dvh-4.75rem)] flex-col overflow-hidden px-6 py-6 lg:px-8">
        <div className="mb-4 grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total open leads</p>
              <p className="mt-1 font-display text-xl font-semibold">{state.leads.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Possible duplicates</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">
                {state.leads.filter((l) => l.duplicate).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="mt-1 font-display text-xl font-semibold text-teal">
                {state.leads.filter((l) => l.status === "Confirmed").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Avg. response time</p>
              <p className="mt-1 font-display text-xl font-semibold">7m</p>
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
                  placeholder="Search by name or email…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <MultiFilter
                label="Website"
                options={websiteNames}
                selected={websiteFilter}
                onChange={setWebsiteFilter}
              />
              <MultiFilter
                label="Status"
                options={statuses}
                selected={statusFilter}
                onChange={setStatusFilter}
              />
              <MultiFilter
                label="Source"
                options={sources}
                selected={sourceFilter}
                onChange={setSourceFilter}
              />
              <MultiFilter
                label="Agent"
                options={agentNames}
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

          <Table containerClassName="min-h-0 flex-1 overflow-auto">
            <TableHeader>
              <TableRow className="group hover:bg-transparent">
                <TableHead className="sticky top-0 z-20 bg-card">Lead</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Tour package / Route</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Travel dates</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Cab / pax / days</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Source</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Agent</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Status</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right whitespace-nowrap">Est. price</TableHead>
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
                          {l.duplicate && (
                            <span title="Possible duplicate">
                              <Copy className="size-3 text-signal" />
                            </span>
                          )}
                        </div>
                        <p className="font-mono-data text-[11px] text-slate-soft">{l.phone}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <p className="truncate text-sm text-ink-text">{l.tourPackage}</p>
                    <p className="truncate text-[11px] text-slate-soft">
                      {l.pickup}{l.dropoff ? ` → ${l.dropoff}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-slate">
                    <p>{formatDisplayDate(l.travelDate)}</p>
                    {l.returnDate ? (
                      <p className="text-[11px] text-slate-soft">to {formatDisplayDate(l.returnDate)}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-slate">
                    {l.cabType}{" "}
                    <span className="text-slate-soft">
                      · {l.adults}A{l.kids > 0 ? `+${l.kids}K` : ""} · {l.days}d
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <Badge variant="outline" className="font-normal">{l.source}</Badge>
                      {l.website && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          🌐 {l.website}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate">{l.agent}</TableCell>
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
                        {statuses.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            disabled={s === l.status}
                            onSelect={() => {
                              updateLead(l.id, {
                                status: s,
                                lastActivity: "Just now",
                                history: track(
                                  l,
                                  "status_changed",
                                  `Status changed to ${s}`,
                                  `${l.status} → ${s} · Dummy tracking`
                                ),
                              });
                              toast({
                                variant: "success",
                                title: "Status updated",
                                description: `${l.name} moved to ${s}.`,
                              });
                            }}
                          >
                            <StatusBadge status={s} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="whitespace-nowrap pr-6 text-right font-mono-data text-sm text-ink-text">
                    ₹{l.budget.toLocaleString("en-IN")}
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
                            onSubmit={(data) => {
                              updateLead(l.id, {
                                ...data,
                                lastActivity: "Just now",
                                history: track(
                                  l,
                                  "updated",
                                  "Lead details updated",
                                  `Dummy · edited by Priya`
                                ),
                              });
                              toast({ variant: "success", title: "Lead updated", description: `${l.id} saved successfully.` });
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
                    No leads match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex shrink-0 items-center justify-between border-t border-border-soft bg-card px-5 py-3 text-xs text-muted-foreground">
            <span>Showing {visible.length} of {state.leads.length} leads</span>
          </div>
        </Card>
      </main>

      <LeadCommentsDrawer
        lead={commentLead}
        open={!!commentLeadId}
        onOpenChange={(v) => !v && setCommentLeadId(null)}
        onAddComment={(leadId, comment) => {
          const current = state.leads.find((l) => l.id === leadId);
          if (!current) return;
          updateLead(leadId, {
            comments: [...(current.comments ?? []), comment],
            lastActivity: "Just now",
            history: track(
              current,
              "comment_added",
              "Comment added",
              comment.text
            ),
          });
          toast({
            variant: "success",
            title: "Comment added",
            description: `Note saved on ${current.name}.`,
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
            quoteLead.pickup && quoteLead.dropoff
              ? `${quoteLead.pickup} → ${quoteLead.dropoff}`
              : quoteLead.tourPackage;
          addQuote({
            leadId: quoteLead.id,
            customer: quoteLead.name,
            route,
            days: quoteLead.days,
            cabType: quoteLead.cabType,
            amount,
            stage: saveAsDraft ? "Draft" : "Sent",
            sentVia,
            note: note || undefined,
          });
          updateLead(quoteLead.id, {
            status: saveAsDraft ? quoteLead.status : "Quoted",
            budget: amount,
            lastActivity: "Just now",
            history: track(
              quoteLead,
              "quoted",
              saveAsDraft ? "Quote draft saved" : "Quote sent",
              saveAsDraft
                ? `Dummy · ₹${amount.toLocaleString("en-IN")} draft`
                : `Dummy · ₹${amount.toLocaleString("en-IN")} via ${sentVia.join(", ")}`
            ),
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
        description={`${deleteTarget?.name ?? ""} (${deleteTarget?.id ?? ""}) will be permanently removed from the pipeline.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteLead(deleteTarget.id);
            toast({ variant: "info", title: "Lead deleted", description: `${deleteTarget.name} was removed.` });
          }
        }}
      />
    </Shell>
  );
}
