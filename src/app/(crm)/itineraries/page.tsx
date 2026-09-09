"use client";

import * as React from "react";
import {
  ChevronDown,
  Copy,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { GridApi } from "ag-grid-community";
import { Topbar } from "@/components/crm/topbar";
import { TableRefreshButton } from "@/components/crm/table-refresh-button";
import { useHasPermission } from "@/lib/use-has-permission";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/crm/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { PagePagination } from "@/components/crm/list-pagination";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { ItineraryStatus, ItineraryTemplate, itineraryPriceAfterDiscount } from "@/lib/data";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import {
  RecordCardsSkeleton,
  StatCardsSkeleton,
} from "@/components/crm/skeletons";
import { CrmGrid, type GridPageRequest } from "@/components/crm/grid/crm-grid";
import {
  buildItinerariesColumnDefs,
  type ItinerariesGridActions,
} from "@/components/crm/grid/itineraries-grid-columns";
import { fetchItinerariesPage, itineraryFromApi } from "@/lib/itineraries-api";

const statuses: ItineraryStatus[] = ["Active", "Draft", "Archived"];
const ITINERARIES_PAGE_SIZE = 25;

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
    refreshItineraries,
    addItinerary,
    updateItinerary,
    deleteItinerary,
    duplicateItinerary,
  } = useData();
  const { toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ItineraryStatus[]>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ItineraryTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ItineraryTemplate | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageItineraries, setPageItineraries] = React.useState<ItineraryTemplate[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listPagination, setListPagination] = React.useState({
    page: 1,
    pageSize: ITINERARIES_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const canCreateItinerary = useHasPermission("itineraries.create");
  const canEditItinerary = useHasPermission("itineraries.edit");
  const canDeleteItinerary = useHasPermission("itineraries.delete");
  const gridApiRef = React.useRef<GridApi<ItineraryTemplate> | null>(null);
  const columnDefs = React.useMemo(() => buildItinerariesColumnDefs(), []);
  const [isDesktop, setIsDesktop] = React.useState(false);

  const activeCount = state.itineraries.filter((t) => t.status === "Active").length;
  const draftCount = state.itineraries.filter((t) => t.status === "Draft").length;
  const totalDays = state.itineraries.reduce((s, t) => s + t.daysPlan.length, 0);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filterKey = `${debouncedSearch}|${statusFilter.join(",")}`;

  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const toolbarFilters = React.useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter.length ? statusFilter : undefined,
    }),
    [debouncedSearch, statusFilter]
  );

  const loadItinerariesPage = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchItinerariesPage({
        ...toolbarFilters,
        page,
        pageSize: ITINERARIES_PAGE_SIZE,
      });
      setPageItineraries(data.itineraries.map(itineraryFromApi));
      setListPagination(data.pagination);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load itineraries",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setListLoading(false);
    }
  }, [toolbarFilters, page, toast]);

  React.useEffect(() => {
    if (isDesktop) return;
    void loadItinerariesPage();
  }, [loadItinerariesPage, isDesktop]);

  React.useEffect(() => {
    if (listPagination.totalPages > 0 && page > listPagination.totalPages) {
      setPage(listPagination.totalPages);
    }
  }, [listPagination.totalPages, page]);

  async function reloadItineraries() {
    gridApiRef.current?.refreshInfiniteCache();
    if (!isDesktop) await loadItinerariesPage();
    await refreshItineraries();
  }

  const fetchGridPage = React.useCallback(
    async (request: GridPageRequest) => {
      const data = await fetchItinerariesPage({
        ...toolbarFilters,
        page: request.page,
        pageSize: request.pageSize,
        sortBy: request.sortBy,
        sortDir: request.sortDir,
        colFilters: request.colFilters,
      });
      return {
        rows: data.itineraries.map(itineraryFromApi),
        total: data.pagination.total,
      };
    },
    [toolbarFilters]
  );

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
      void reloadItineraries();
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
      void reloadItineraries();
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
      void reloadItineraries();
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
      void reloadItineraries();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not delete template",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  const gridActions = React.useMemo<ItinerariesGridActions>(
    () => ({
      canEditItinerary,
      canDeleteItinerary,
      onEdit: openEdit,
      onDuplicate: (t) => void handleDuplicate(t),
      onArchiveToggle: (t) => void handleArchiveToggle(t),
      onDelete: setDeleteTarget,
    }),
    [canEditItinerary, canDeleteItinerary]
  );

  const rangeStart =
    listPagination.total === 0 ? 0 : (listPagination.page - 1) * listPagination.pageSize + 1;
  const rangeEnd = Math.min(
    listPagination.page * listPagination.pageSize,
    listPagination.total
  );

  return (
    <>
      <Topbar
        title="Itineraries"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TableRefreshButton
              onRefresh={() => void reloadItineraries()}
              loading={itinerariesLoading || listLoading}
            />
            {canCreateItinerary ? (
              <Button variant="marigold" size="sm" onClick={openCreate}>
                <Plus className="size-3.5" /> New template
              </Button>
            ) : null}
          </div>
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col">
        {itinerariesLoading ? (
          <StatCardsSkeleton />
        ) : (
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
        )}

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
              {listPagination.total} of {state.itineraries.length}
            </p>
          </div>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative hidden min-h-0 flex-1 md:block">
            <CrmGrid<ItineraryTemplate>
              className="h-full min-h-[28rem]"
              columnDefs={columnDefs}
              fetchPage={fetchGridPage}
              toolbarKey={filterKey}
              storageKey="crm.ag.itineraries.v1"
              context={gridActions}
              onGridApi={(api) => {
                gridApiRef.current = api;
              }}
              onError={(error) => {
                toast({
                  variant: "error",
                  title: "Could not load itineraries",
                  description: error instanceof Error ? error.message : "Please try again.",
                });
              }}
              onStats={({ total }) => {
                setListPagination((prev) => ({
                  ...prev,
                  total,
                  totalPages: Math.max(1, Math.ceil(total / prev.pageSize) || 1),
                }));
                setListLoading(false);
              }}
            />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:hidden">
            {listLoading && pageItineraries.length === 0 ? (
              <RecordCardsSkeleton count={4} />
            ) : pageItineraries.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-soft">
                No itinerary templates match your filters.
              </p>
            ) : (
              pageItineraries.map((t) => (
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
                    {canEditItinerary ? (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => openEdit(t)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    ) : null}
                    {canEditItinerary ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => void handleDuplicate(t)}
                      >
                        <Copy className="size-3.5" /> Copy
                      </Button>
                    ) : null}
                    {canDeleteItinerary ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-signal"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    ) : null}
                  </div>
                </RecordCard>
              ))
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
