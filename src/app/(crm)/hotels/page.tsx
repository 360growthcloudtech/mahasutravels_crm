"use client";

import * as React from "react";
import {
  Pencil,
  Search,
  Plus,
  Copy,
  Trash2,
  Filter,
  ChevronDown,
} from "lucide-react";
import type { GridApi } from "ag-grid-community";
import { Topbar } from "@/components/crm/topbar";
import { TableRefreshButton } from "@/components/crm/table-refresh-button";
import { useHasPermission } from "@/lib/use-has-permission";
import { Card, CardContent } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/crm/status-badge";
import {
  HotelTemplateFormDialog,
  HotelTemplateFormState,
} from "@/components/crm/hotel-template-form-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { PagePagination } from "@/components/crm/list-pagination";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import {
  RecordCardsSkeleton,
  StatCardsSkeleton,
} from "@/components/crm/skeletons";
import { CrmGrid, type GridPageRequest } from "@/components/crm/grid/crm-grid";
import {
  buildHotelsColumnDefs,
  type HotelsGridActions,
} from "@/components/crm/grid/hotels-grid-columns";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { HotelTemplate, HotelTemplateStatus } from "@/lib/data";
import { fetchHotelsPage, hotelFromApi } from "@/lib/hotels-api";

const statuses: HotelTemplateStatus[] = ["Active", "Draft", "Archived"];
const HOTELS_PAGE_SIZE = 25;

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function HotelsPage() {
  const {
    state,
    hotelsLoading,
    refreshHotels,
    addHotelTemplate,
    updateHotelTemplate,
    deleteHotelTemplate,
    duplicateHotelTemplate,
  } = useData();
  const { toast } = useToast();

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<HotelTemplateStatus[]>([]);
  const [templateFormOpen, setTemplateFormOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<HotelTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = React.useState<HotelTemplate | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageHotels, setPageHotels] = React.useState<HotelTemplate[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listPagination, setListPagination] = React.useState({
    page: 1,
    pageSize: HOTELS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const canCreateHotel = useHasPermission("hotels.create");
  const canEditHotel = useHasPermission("hotels.edit");
  const canDeleteHotel = useHasPermission("hotels.delete");
  const gridApiRef = React.useRef<GridApi<HotelTemplate> | null>(null);
  const columnDefs = React.useMemo(() => buildHotelsColumnDefs(), []);
  const [isDesktop, setIsDesktop] = React.useState(false);

  const activeMasters = state.hotelTemplates.filter((t) => t.status === "Active").length;
  const draftMasters = state.hotelTemplates.filter((t) => t.status === "Draft").length;
  const avgRate =
    state.hotelTemplates.length > 0
      ? Math.round(
          state.hotelTemplates.reduce((s, t) => s + t.typicalRate, 0) /
            state.hotelTemplates.length
        )
      : 0;

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

  const filterKey = `${debouncedQuery}|${statusFilter.join(",")}`;

  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const toolbarFilters = React.useMemo(
    () => ({
      search: debouncedQuery || undefined,
      status: statusFilter.length ? statusFilter : undefined,
    }),
    [debouncedQuery, statusFilter]
  );

  const loadHotelsPage = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchHotelsPage({
        ...toolbarFilters,
        page,
        pageSize: HOTELS_PAGE_SIZE,
      });
      setPageHotels(data.hotels.map(hotelFromApi));
      setListPagination(data.pagination);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load hotels",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setListLoading(false);
    }
  }, [toolbarFilters, page, toast]);

  React.useEffect(() => {
    if (isDesktop) return;
    void loadHotelsPage();
  }, [loadHotelsPage, isDesktop]);

  React.useEffect(() => {
    if (listPagination.totalPages > 0 && page > listPagination.totalPages) {
      setPage(listPagination.totalPages);
    }
  }, [listPagination.totalPages, page]);

  async function reloadHotels() {
    gridApiRef.current?.refreshInfiniteCache();
    if (!isDesktop) await loadHotelsPage();
    await refreshHotels();
  }

  const fetchGridPage = React.useCallback(
    async (request: GridPageRequest) => {
      const data = await fetchHotelsPage({
        ...toolbarFilters,
        page: request.page,
        pageSize: request.pageSize,
        sortBy: request.sortBy,
        sortDir: request.sortDir,
        colFilters: request.colFilters,
      });
      return {
        rows: data.hotels.map(hotelFromApi),
        total: data.pagination.total,
      };
    },
    [toolbarFilters]
  );

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateFormOpen(true);
  }

  function openEditTemplate(t: HotelTemplate) {
    setEditingTemplate(t);
    setTemplateFormOpen(true);
  }

  async function handleTemplateSubmit(data: HotelTemplateFormState) {
    try {
      if (editingTemplate) {
        await updateHotelTemplate(editingTemplate.id, data);
        toast({ variant: "success", title: "Hotel template updated", description: data.name });
      } else {
        await addHotelTemplate(data);
        toast({ variant: "success", title: "Hotel template created", description: data.name });
      }
      void reloadHotels();
    } catch (error) {
      toast({
        variant: "error",
        title: editingTemplate ? "Could not update hotel" : "Could not create hotel",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  async function handleDuplicate(t: HotelTemplate) {
    try {
      await duplicateHotelTemplate(t.id);
      toast({
        variant: "success",
        title: "Template duplicated",
        description: `${t.name} (Copy) as Draft`,
      });
      void reloadHotels();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not duplicate",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleArchiveToggle(t: HotelTemplate) {
    const nextStatus = t.status === "Archived" ? "Active" : "Archived";
    try {
      await updateHotelTemplate(t.id, { status: nextStatus });
      toast({
        variant: nextStatus === "Archived" ? "info" : "success",
        title: nextStatus === "Archived" ? "Archived" : "Restored",
        description: t.name,
      });
      void reloadHotels();
    } catch (error) {
      toast({
        variant: "error",
        title: nextStatus === "Archived" ? "Could not archive" : "Could not restore",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  const gridActions = React.useMemo<HotelsGridActions>(
    () => ({
      canEditHotel,
      canDeleteHotel,
      onEdit: openEditTemplate,
      onDuplicate: (t) => void handleDuplicate(t),
      onArchiveToggle: (t) => void handleArchiveToggle(t),
      onDelete: setDeleteTemplate,
    }),
    [canEditHotel, canDeleteHotel]
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
        title="Hotels"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TableRefreshButton
              onRefresh={() => void reloadHotels()}
              loading={hotelsLoading || listLoading}
            />
            {canCreateHotel ? (
              <Button variant="marigold" size="sm" onClick={openCreateTemplate}>
                <Plus className="size-3.5" /> New hotel template
              </Button>
            ) : null}
          </div>
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col">
        {hotelsLoading ? (
          <StatCardsSkeleton />
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Master templates</p>
                <p className="mt-1 font-display text-xl font-semibold">
                  {state.hotelTemplates.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="mt-1 font-display text-xl font-semibold text-teal">{activeMasters}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Drafts</p>
                <p className="mt-1 font-display text-xl font-semibold">{draftMasters}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Avg typical rate / day</p>
                <p className="mt-1 font-display text-xl font-semibold text-marigold-ink">
                  ₹{avgRate.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-border-soft bg-paper px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-soft" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hotel, city, ID…"
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
                <DropdownMenuLabel>Template status</DropdownMenuLabel>
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
              {listPagination.total} of {state.hotelTemplates.length}
            </p>
          </div>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative hidden min-h-0 flex-1 md:block">
            <CrmGrid<HotelTemplate>
              className="h-full min-h-[28rem]"
              columnDefs={columnDefs}
              fetchPage={fetchGridPage}
              toolbarKey={filterKey}
              storageKey="crm.ag.hotels.v1"
              context={gridActions}
              onGridApi={(api) => {
                gridApiRef.current = api;
              }}
              onError={(error) => {
                toast({
                  variant: "error",
                  title: "Could not load hotels",
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
            {listLoading && pageHotels.length === 0 ? (
              <RecordCardsSkeleton count={4} />
            ) : pageHotels.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-soft">
                No hotel templates match. Create a master template to get started.
              </p>
            ) : (
              pageHotels.map((t) => (
                <RecordCard key={t.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] leading-snug font-semibold break-words text-ink-text">
                        {t.name}
                      </p>
                      <p className="mt-1 font-mono-data text-[11px] text-slate-soft">{t.hotelNo}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <InfoGrid className="grid-cols-2 gap-y-3">
                    <InfoItem label="City">{t.city || "—"}</InfoItem>
                    <InfoItem label="Rate / day">
                      ₹{t.typicalRate.toLocaleString("en-IN")}
                    </InfoItem>
                    <InfoItem label="Default room" className="col-span-2">
                      {t.defaultRoomType || "—"}
                    </InfoItem>
                    <InfoItem label="Address" className="col-span-2">
                      {t.address || "—"}
                    </InfoItem>
                    {t.contactNumber ? (
                      <InfoItem label="Contact" className="col-span-2">
                        {t.contactNumber}
                      </InfoItem>
                    ) : null}
                    <InfoItem label="Updated" className="col-span-2">
                      {t.updatedAt}
                    </InfoItem>
                  </InfoGrid>
                  <div className="grid grid-cols-3 gap-2 border-t border-border-soft pt-3">
                    {canEditHotel ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => openEditTemplate(t)}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    ) : null}
                    {canEditHotel ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => void handleDuplicate(t)}
                      >
                        <Copy className="size-3.5" /> Copy
                      </Button>
                    ) : null}
                    {canDeleteHotel ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-signal"
                        onClick={() => setDeleteTemplate(t)}
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

      <HotelTemplateFormDialog
        open={templateFormOpen}
        onOpenChange={setTemplateFormOpen}
        template={editingTemplate}
        onSubmit={handleTemplateSubmit}
      />

      <ConfirmDialog
        open={!!deleteTemplate}
        onOpenChange={(open) => !open && setDeleteTemplate(null)}
        title="Delete hotel template?"
        description={
          deleteTemplate
            ? `"${deleteTemplate.name}" will be removed from the master library.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleteTemplate) return;
          void deleteHotelTemplate(deleteTemplate.id)
            .then(() => {
              toast({
                variant: "info",
                title: "Template deleted",
                description: deleteTemplate.name,
              });
              setDeleteTemplate(null);
              void reloadHotels();
            })
            .catch((error) =>
              toast({
                variant: "error",
                title: "Could not delete hotel",
                description: error instanceof Error ? error.message : "Please try again.",
              })
            );
        }}
      />
    </>
  );
}
