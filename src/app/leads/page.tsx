"use client";

import * as React from "react";
import { Copy, MoreHorizontal, Phone, MessageCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { Shell } from "@/components/crm/shell";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LeadFormDialog } from "@/components/crm/lead-form-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Lead } from "@/lib/data";

const filters = ["All leads", "New", "Contacted", "Quoted", "Follow-up", "Confirmed", "Lost"] as const;

export default function LeadsPage() {
  const { state, addLead, updateLead, deleteLead } = useData();
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<(typeof filters)[number]>("All leads");
  const [deleteTarget, setDeleteTarget] = React.useState<Lead | null>(null);

  const visible =
    filter === "All leads" ? state.leads : state.leads.filter((l) => l.status === filter);

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
              addLead(data);
              toast({ variant: "success", title: "Lead added", description: `${data.name} was added to the pipeline.` });
            }}
          />
        }
      />

      <main className="px-6 py-6 lg:px-8">
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

        <Card>
          <div className="flex flex-col gap-3 border-b border-border-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as (typeof filters)[number])}>
              <TabsList className="h-auto flex-wrap">
                {filters.map((f) => (
                  <TabsTrigger key={f} value={f} className="text-xs">
                    {f}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Destination / Route</TableHead>
                <TableHead>Travel dates</TableHead>
                <TableHead>Cab / pax / days</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Est. price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((l) => (
                <TableRow key={l.id}>
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
                    <p className="truncate text-sm text-ink-text">{l.destination || l.tourPackage}</p>
                    <p className="text-[11px] text-slate-soft">
                      {l.pickup}{l.dropoff ? ` → ${l.dropoff}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-slate">
                    <p>{l.travelDate}</p>
                    {l.returnDate ? (
                      <p className="text-[11px] text-slate-soft">to {l.returnDate}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-slate">
                    {l.cabType}{" "}
                    <span className="text-slate-soft">
                      · {l.adults}A{l.kids > 0 ? `+${l.kids}K` : ""} · {l.days}d
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{l.source}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate">{l.agent}</TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono-data text-sm text-ink-text">
                    ₹{l.budget.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="size-8">
                        <Phone className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8">
                        <MessageCircle className="size-3.5" />
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
                              updateLead(l.id, data);
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
                    No leads in this stage yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border-soft px-5 py-3 text-xs text-muted-foreground">
            <span>Showing {visible.length} of {state.leads.length} leads</span>
          </div>
        </Card>
      </main>

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
