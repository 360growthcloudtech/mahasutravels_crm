"use client";

import * as React from "react";
import {
  Pencil,
  Hotel as HotelIcon,
  Search,
  Plus,
  Copy,
  MoreHorizontal,
  Archive,
  Trash2,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Shell } from "@/components/crm/shell";
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
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { HotelTemplate, HotelTemplateStatus } from "@/lib/data";

const statuses: HotelTemplateStatus[] = ["Active", "Draft", "Archived"];

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function HotelsPage() {
  const {
    state,
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
      t.id.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(t.status);
    return matchesSearch && matchesStatus;
  });

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateFormOpen(true);
  }

  function openEditTemplate(t: HotelTemplate) {
    setEditingTemplate(t);
    setTemplateFormOpen(true);
  }

  function handleTemplateSubmit(data: HotelTemplateFormState) {
    if (editingTemplate) {
      updateHotelTemplate(editingTemplate.id, data);
      toast({ variant: "success", title: "Hotel template updated", description: data.name });
    } else {
      addHotelTemplate(data);
      toast({ variant: "success", title: "Hotel template created", description: data.name });
    }
  }

  return (
    <Shell>
      <Topbar
        title="Hotels"
        action={
          <Button variant="marigold" size="sm" onClick={openCreateTemplate}>
            <Plus className="size-3.5" /> New hotel template
          </Button>
        }
      />

      <main className="page-pad">
        <Card className="mb-4 border-dashed">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-marigold-soft text-marigold-ink">
              <HotelIcon className="size-4.5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink-text">Master hotel templates</p>
              <p className="text-xs text-muted-foreground">
                There&apos;s no hotel inventory or live availability here by design. Maintain reusable
                hotel masters here. When a booking needs a stay, ops can use these templates without
                changing the original. Assignment on bookings remains optional.
              </p>
            </div>
          </CardContent>
        </Card>

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
              <p className="text-xs text-muted-foreground">Avg typical rate</p>
              <p className="mt-1 font-display text-xl font-semibold text-marigold-ink">
                ₹{avgRate.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
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

        <Card className="overflow-hidden">
          <div className="hidden overflow-auto md:block">
            <Table containerClassName="min-w-[48rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Default room</TableHead>
                  <TableHead>Typical rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[5.5rem]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-soft">
                      No hotel templates match. Create a master template to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((t) => (
                    <TableRow key={t.id} className="group">
                      <TableCell>
                        <p className="text-sm font-medium text-ink-text">{t.name}</p>
                        <p className="font-mono-data text-[11px] text-slate-soft">{t.id}</p>
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
                              <DropdownMenuItem
                                onSelect={() => {
                                  duplicateHotelTemplate(t.id);
                                  toast({
                                    variant: "success",
                                    title: "Template duplicated",
                                    description: `${t.name} (Copy) as Draft`,
                                  });
                                }}
                              >
                                <Copy className="size-3.5" /> Duplicate
                              </DropdownMenuItem>
                              {t.status !== "Archived" ? (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    updateHotelTemplate(t.id, { status: "Archived" });
                                    toast({
                                      variant: "info",
                                      title: "Archived",
                                      description: t.name,
                                    });
                                  }}
                                >
                                  <Archive className="size-3.5" /> Archive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    updateHotelTemplate(t.id, { status: "Active" });
                                    toast({
                                      variant: "success",
                                      title: "Restored",
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

          <div className="space-y-3 p-3 md:hidden">
            {filteredTemplates.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-soft">
                No hotel templates match. Create a master template to get started.
              </p>
            ) : (
              filteredTemplates.map((t) => (
                <RecordCard key={t.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-semibold break-words text-ink-text">{t.name}</p>
                      <p className="font-mono-data text-[11px] text-slate-soft">{t.id}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <InfoGrid>
                    <InfoItem label="City">{t.city || "—"}</InfoItem>
                    <InfoItem label="Typical rate">₹{t.typicalRate.toLocaleString("en-IN")}</InfoItem>
                    <InfoItem label="Default room" className="sm:col-span-2">
                      {t.defaultRoomType || "—"}
                    </InfoItem>
                    <InfoItem label="Address" className="sm:col-span-2">
                      {t.address || "—"}
                    </InfoItem>
                    <InfoItem label="Updated">{t.updatedAt}</InfoItem>
                  </InfoGrid>
                  <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                    <Button size="sm" variant="outline" onClick={() => openEditTemplate(t)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        duplicateHotelTemplate(t.id);
                        toast({
                          variant: "success",
                          title: "Template duplicated",
                          description: `${t.name} (Copy) as Draft`,
                        });
                      }}
                    >
                      <Copy className="size-3.5" /> Duplicate
                    </Button>
                    <Button size="sm" variant="outline" className="text-signal" onClick={() => setDeleteTemplate(t)}>
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </div>
                </RecordCard>
              ))
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
          deleteHotelTemplate(deleteTemplate.id);
          toast({
            variant: "info",
            title: "Template deleted",
            description: deleteTemplate.name,
          });
          setDeleteTemplate(null);
        }}
      />
    </Shell>
  );
}
