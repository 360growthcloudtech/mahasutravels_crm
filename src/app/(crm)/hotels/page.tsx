"use client";

import * as React from "react";
import {
  Pencil,
  Search,
  Plus,
  Copy,
  MoreHorizontal,
  Archive,
  Trash2,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Topbar } from "@/components/crm/topbar";
import { Card, CardContent } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/crm/status-badge";
import {
  HotelTemplateFormDialog,
  HotelTemplateFormState,
} from "@/components/crm/hotel-template-form-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import {
  InfiniteScrollSentinel,
  PagePagination,
} from "@/components/crm/list-pagination";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { useListPagination } from "@/lib/use-list-pagination";
import { HotelTemplate, HotelTemplateStatus } from "@/lib/data";

const statuses: HotelTemplateStatus[] = ["Active", "Draft", "Archived"];

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function HotelsPage() {
  const {
    state,
    hotelsLoading,
    addHotelTemplate,
    updateHotelTemplate,
    deleteHotelTemplate,
    duplicateHotelTemplate,
  } = useData();
  const { toast } = useToast();

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<HotelTemplateStatus[]>([]);
  const [templateFormOpen, setTemplateFormOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<HotelTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = React.useState<HotelTemplate | null>(null);

  const activeMasters = state.hotelTemplates.filter((t) => t.status === "Active").length;
  const draftMasters = state.hotelTemplates.filter((t) => t.status === "Draft").length;
  const avgRate =
    state.hotelTemplates.length > 0
      ? Math.round(
          state.hotelTemplates.reduce((s, t) => s + t.typicalRate, 0) / state.hotelTemplates.length
        )
      : 0;

  const q = query.trim().toLowerCase();
  const filteredTemplates = state.hotelTemplates.filter((t) => {
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.hotelNo.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(t.status);
    return matchesSearch && matchesStatus;
  });

  const pagination = useListPagination(filteredTemplates, {
    pageSize: 10,
    resetKey: `${query}|${statusFilter.join(",")}`,
  });

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
    } catch (error) {
      toast({
        variant: "error",
        title: nextStatus === "Archived" ? "Could not archive" : "Could not restore",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  return (
    <>
      <Topbar
        title="Hotels"
        action={
          <Button variant="marigold" size="sm" onClick={openCreateTemplate}>
            <Plus className="size-3.5" /> New hotel template
          </Button>
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Master templates</p>
              <p className="mt-1 font-display text-xl font-semibold">{state.hotelTemplates.length}</p>
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
              {filteredTemplates.length} of {state.hotelTemplates.length}
            </p>
          </div>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="hidden min-h-0 flex-1 flex-col md:flex">
            <div className="min-h-0 flex-1 overflow-auto">
              <Table containerClassName="min-w-[48rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-20 bg-card">Hotel</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">City</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Default room</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Typical rate / day</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Status</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-card">Updated</TableHead>
                    <TableHead className="sticky top-0 z-20 w-[5.5rem] bg-card">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.desktopItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-soft">
                        {hotelsLoading
                          ? "Loading hotel templates…"
                          : "No hotel templates match. Create a master template to get started."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagination.desktopItems.map((t) => (
                      <TableRow key={t.id} className="group">
                        <TableCell>
                          <p className="text-sm font-medium text-ink-text">{t.name}</p>
                          <p className="font-mono-data text-[11px] text-slate-soft">{t.hotelNo}</p>
                          {t.address ? (
                            <p className="mt-0.5 text-xs text-slate">{t.address}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">{t.city}</TableCell>
                        <TableCell className="text-sm text-slate">{t.defaultRoomType || "—"}</TableCell>
                        <TableCell className="font-mono-data text-sm">
                          ₹{t.typicalRate.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="text-sm text-slate">{t.updatedAt}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => openEditTemplate(t)}
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
                                <DropdownMenuItem onSelect={() => openEditTemplate(t)}>
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
                                  onSelect={() => setDeleteTemplate(t)}
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
                {hotelsLoading
                  ? "Loading hotel templates…"
                  : "No hotel templates match. Create a master template to get started."}
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => openEditTemplate(t)}
                      >
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
                        onClick={() => setDeleteTemplate(t)}
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
