"use client";

import * as React from "react";
import {
  ChevronDown,
  Copy,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Archive,
} from "lucide-react";
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
import {
  InfiniteScrollSentinel,
  PagePagination,
} from "@/components/crm/list-pagination";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { useListPagination } from "@/lib/use-list-pagination";
import { ItineraryStatus, ItineraryTemplate, itineraryPriceAfterDiscount } from "@/lib/data";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";

const statuses: ItineraryStatus[] = ["Active", "Draft", "Archived"];

const stickyActionHead =
  "sticky right-0 top-0 z-30 min-w-[8rem] whitespace-nowrap border-l border-border-soft bg-card";
const stickyActionCell =
  "relative sticky right-0 z-20 min-w-[8rem] border-l border-border-soft bg-card before:absolute before:inset-0 before:-z-10 before:bg-card before:content-[''] group-hover:bg-secondary group-hover:before:bg-secondary";

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function durationLabel(t: Pick<ItineraryTemplate, "nights" | "days">) {
  const nights = t.nights?.trim() || "—";
  const days = t.days?.trim() || "—";
  return `${nights}N / ${days}D`;
}

export default function ItinerariesPage() {
  const {
    state,
    itinerariesLoading,
    addItinerary,
    updateItinerary,
    deleteItinerary,
    duplicateItinerary,
  } = useData();
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
      t.itineraryNo.toLowerCase().includes(q);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(t.status);
    return matchesSearch && matchesStatus;
  });

  const pagination = useListPagination(filtered, {
    pageSize: 10,
    resetKey: `${search}|${statusFilter.join(",")}`,
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

  async function handleSubmit(data: ItineraryFormState) {
    try {
      if (editing) {
        await updateItinerary(editing.id, data);
        toast({ variant: "success", title: "Template updated", description: data.name });
      } else {
        await addItinerary(data);
        toast({ variant: "success", title: "Template created", description: data.name });
      }
    } catch (error) {
      toast({
        variant: "error",
        title: editing ? "Could not update template" : "Could not create template",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  async function handleDuplicate(t: ItineraryTemplate) {
    try {
      await duplicateItinerary(t.id);
      toast({
        variant: "success",
        title: "Template duplicated",
        description: `${t.name} (Copy) saved as Draft`,
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not duplicate template",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleArchiveToggle(t: ItineraryTemplate) {
    const nextStatus = t.status === "Archived" ? "Active" : "Archived";
    try {
      await updateItinerary(t.id, { status: nextStatus });
      toast({
        variant: nextStatus === "Archived" ? "info" : "success",
        title: nextStatus === "Archived" ? "Archived" : "Restored to Active",
        description: t.name,
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update status",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteItinerary(deleteTarget.id);
      toast({ variant: "info", title: "Template deleted", description: deleteTarget.name });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not delete template",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  return (
    <>
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

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="hidden min-h-0 flex-1 flex-col md:flex">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table containerClassName="min-w-[52rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-20 bg-card">Template</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Package</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Duration</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">From</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Discount</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Status</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Updated</TableHead>
                    <TableHead className={stickyActionHead}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.desktopItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-soft">
                        {itinerariesLoading
                          ? "Loading itinerary templates…"
                          : "No itinerary templates match your filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagination.desktopItems.map((t) => (
                      <TableRow key={t.id} className="group">
                        <TableCell>
                          <p className="text-sm font-medium text-ink-text">{t.name}</p>
                          <p className="font-mono-data text-[11px] text-slate-soft">{t.itineraryNo}</p>
                          {t.subtitle ? (
                            <p className="mt-0.5 text-xs text-slate">{t.subtitle}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="max-w-[14rem] text-sm text-slate">
                          {t.tourPackage}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono-data text-sm">
                          {durationLabel(t)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono-data text-sm">
                          <p>₹{t.startingFrom.toLocaleString("en-IN")}</p>
                          {(t.discountPercentage ?? 0) > 0 ? (
                            <p className="text-[11px] text-teal">
                              ₹
                              {itineraryPriceAfterDiscount(
                                t.startingFrom,
                                t.discountPercentage
                              ).toLocaleString("en-IN")}{" "}
                              after discount
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-slate">
                          {(t.discountPercentage ?? 0) > 0 ? `${t.discountPercentage}%` : "—"}
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
                                <DropdownMenuItem onSelect={() => void handleDuplicate(t)}>
                                  <Copy className="size-3.5" /> Duplicate
                                </DropdownMenuItem>
                                {t.status !== "Archived" ? (
                                  <DropdownMenuItem onSelect={() => void handleArchiveToggle(t)}>
                                    <Archive className="size-3.5" /> Archive
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onSelect={() => void handleArchiveToggle(t)}>
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
            <PagePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              rangeStart={pagination.rangeStart}
              rangeEnd={pagination.rangeEnd}
              onPageChange={pagination.setPage}
            />
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {pagination.mobileItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-soft">
                {itinerariesLoading
                  ? "Loading itinerary templates…"
                  : "No itinerary templates match your filters."}
              </p>
            ) : (
              <>
                {pagination.mobileItems.map((t) => (
                  <RecordCard key={t.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-snug font-semibold break-words text-ink-text">
                          {t.name}
                        </p>
                        <p className="mt-1 font-mono-data text-[11px] text-slate-soft">
                          {t.itineraryNo}
                        </p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                    {t.subtitle ? (
                      <p className="text-xs leading-relaxed text-slate">{t.subtitle}</p>
                    ) : null}
                    <InfoGrid className="grid-cols-2 gap-y-3">
                      <InfoItem label="Package" className="col-span-2">
                        {t.tourPackage || "—"}
                      </InfoItem>
                      <InfoItem label="Duration">{durationLabel(t)}</InfoItem>
                      <InfoItem label="Updated">{t.updatedAt}</InfoItem>
                      <InfoItem label="From">
                        ₹{t.startingFrom.toLocaleString("en-IN")}
                      </InfoItem>
                      <InfoItem label="Discount">
                        {(t.discountPercentage ?? 0) > 0 ? (
                          <span>
                            {t.discountPercentage}%
                            <span className="mt-0.5 block text-teal">
                              ₹
                              {itineraryPriceAfterDiscount(
                                t.startingFrom,
                                t.discountPercentage
                              ).toLocaleString("en-IN")}{" "}
                              after
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </InfoItem>
                    </InfoGrid>
                    <div className="grid grid-cols-3 gap-2 border-t border-border-soft pt-3">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => openEdit(t)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => void handleDuplicate(t)}
                      >
                        <Copy className="size-3.5" /> Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-signal"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    </div>
                  </RecordCard>
                ))}
                <InfiniteScrollSentinel
                  hasMore={pagination.hasMoreMobile}
                  onLoadMore={pagination.loadMoreMobile}
                  loadedCount={pagination.mobileItems.length}
                  total={pagination.total}
                />
              </>
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
          void handleDelete();
        }}
      />
    </>
  );
}
