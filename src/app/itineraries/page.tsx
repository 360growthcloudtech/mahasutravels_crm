"use client";

import * as React from "react";
import {
  ChevronDown,
  Copy,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Route,
  Search,
  Trash2,
  Archive,
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
import {
  ItineraryFormDialog,
  ItineraryFormState,
} from "@/components/crm/itinerary-form-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { ItineraryStatus, ItineraryTemplate } from "@/lib/data";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";

const statuses: ItineraryStatus[] = ["Active", "Draft", "Archived"];

const stickyActionHead =
  "sticky right-0 top-0 z-30 min-w-[8rem] whitespace-nowrap border-l border-border-soft bg-card";
const stickyActionCell =
  "relative sticky right-0 z-20 min-w-[8rem] border-l border-border-soft bg-card before:absolute before:inset-0 before:-z-10 before:bg-card before:content-[''] group-hover:bg-secondary group-hover:before:bg-secondary";

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function ItinerariesPage() {
  const { state, addItinerary, updateItinerary, deleteItinerary, duplicateItinerary } = useData();
  const { toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ItineraryStatus[]>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ItineraryTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ItineraryTemplate | null>(null);

  const filtered = state.itineraries.filter((t) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.tourPackage.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(t.status);
    return matchesSearch && matchesStatus;
  });

  const activeCount = state.itineraries.filter((t) => t.status === "Active").length;
  const draftCount = state.itineraries.filter((t) => t.status === "Draft").length;
  const totalDays = state.itineraries.reduce((s, t) => s + t.daysPlan.length, 0);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(t: ItineraryTemplate) {
    setEditing(t);
    setFormOpen(true);
  }

  function handleSubmit(data: ItineraryFormState) {
    if (editing) {
      updateItinerary(editing.id, data);
      toast({ variant: "success", title: "Template updated", description: data.name });
    } else {
      addItinerary(data);
      toast({ variant: "success", title: "Template created", description: data.name });
    }
  }

  return (
    <Shell>
      <Topbar
        title="Itineraries"
        action={
          <Button variant="marigold" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" /> New template
          </Button>
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Templates</p>
              <p className="mt-1 font-display text-xl font-semibold">{state.itineraries.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="mt-1 font-display text-xl font-semibold text-teal">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Drafts</p>
              <p className="mt-1 font-display text-xl font-semibold">{draftCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total days planned</p>
              <p className="mt-1 font-display text-xl font-semibold">{totalDays}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4 border-dashed">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-marigold-soft text-marigold-ink">
              <Route className="size-4.5" />
            </div>
            <p className="text-xs text-muted-foreground">
              Edit master templates here. When you customize an itinerary for a guest from Quotes,
              CRM clones the days onto that lead — the original template stays unchanged.
            </p>
          </CardContent>
        </Card>

        <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-border-soft bg-paper px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-soft" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, package, ID…"
                className="h-8 pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal">
                  <Filter className="size-3.5 text-slate-soft" />
                  Status
                  {statusFilter.length > 0 ? (
                    <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1.5">
                      {statusFilter.length}
                    </Badge>
                  ) : (
                    <ChevronDown className="size-3.5 text-slate-soft" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[11rem]">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statuses.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option}
                    checked={statusFilter.includes(option)}
                    onCheckedChange={() => setStatusFilter(toggleValue(statusFilter, option))}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {option}
                  </DropdownMenuCheckboxItem>
                ))}
                {statusFilter.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-slate" onSelect={() => setStatusFilter([])}>
                      Clear status
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="ml-auto text-xs text-slate-soft">
              {filtered.length} of {state.itineraries.length}
            </p>
          </div>
        </div>

        <Card className="min-h-0 flex-1 overflow-hidden">
          <div className="hidden h-full overflow-auto md:block">
            <Table containerClassName="min-w-[52rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-20 bg-card">Template</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-card">Package</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-card">Duration</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-card">From</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-card">Status</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-card">Updated</TableHead>
                  <TableHead className={stickyActionHead}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-soft">
                      No itinerary templates match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => (
                    <TableRow key={t.id} className="group">
                      <TableCell>
                        <p className="text-sm font-medium text-ink-text">{t.name}</p>
                        <p className="font-mono-data text-[11px] text-slate-soft">{t.id}</p>
                        {t.subtitle ? (
                          <p className="mt-0.5 text-xs text-slate">{t.subtitle}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[14rem] text-sm text-slate">
                        {t.tourPackage}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono-data text-sm">
                        {t.nights}N / {t.days}D
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono-data text-sm">
                        ₹{t.startingFrom.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="text-sm text-slate">{t.updatedAt}</TableCell>
                      <TableCell className={stickyActionCell}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Edit ${t.name}`}
                            onClick={() => openEdit(t)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openEdit(t)}>
                                <Pencil className="size-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  duplicateItinerary(t.id);
                                  toast({
                                    variant: "success",
                                    title: "Template duplicated",
                                    description: `${t.name} (Copy) saved as Draft`,
                                  });
                                }}
                              >
                                <Copy className="size-3.5" /> Duplicate
                              </DropdownMenuItem>
                              {t.status !== "Archived" ? (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    updateItinerary(t.id, { status: "Archived" });
                                    toast({ variant: "info", title: "Archived", description: t.name });
                                  }}
                                >
                                  <Archive className="size-3.5" /> Archive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    updateItinerary(t.id, { status: "Active" });
                                    toast({
                                      variant: "success",
                                      title: "Restored to Active",
                                      description: t.name,
                                    });
                                  }}
                                >
                                  <Archive className="size-3.5" /> Restore
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-signal focus:text-signal"
                                onSelect={() => setDeleteTarget(t)}
                              >
                                <Trash2 className="size-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-soft">
                No itinerary templates match your filters.
              </p>
            ) : (
              filtered.map((t) => (
                <RecordCard key={t.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-semibold break-words text-ink-text">{t.name}</p>
                      <p className="font-mono-data text-[11px] text-slate-soft">{t.id}</p>
                      {t.subtitle ? <p className="mt-0.5 text-xs text-slate">{t.subtitle}</p> : null}
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <InfoGrid>
                    <InfoItem label="Package" className="sm:col-span-2">
                      {t.tourPackage}
                    </InfoItem>
                    <InfoItem label="Duration">
                      {t.nights}N / {t.days}D
                    </InfoItem>
                    <InfoItem label="From">₹{t.startingFrom.toLocaleString("en-IN")}</InfoItem>
                    <InfoItem label="Updated">{t.updatedAt}</InfoItem>
                  </InfoGrid>
                  <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        duplicateItinerary(t.id);
                        toast({ variant: "success", title: "Template duplicated", description: `${t.name} (Copy)` });
                      }}
                    >
                      <Copy className="size-3.5" /> Duplicate
                    </Button>
                    <Button size="sm" variant="outline" className="text-signal" onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </div>
                </RecordCard>
              ))
            )}
          </div>
        </Card>
      </main>

      <ItineraryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        itinerary={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete itinerary template?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed from the library. Guest copies already saved on leads are kept.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteItinerary(deleteTarget.id);
          toast({ variant: "info", title: "Template deleted", description: deleteTarget.name });
          setDeleteTarget(null);
        }}
      />
    </Shell>
  );
}
