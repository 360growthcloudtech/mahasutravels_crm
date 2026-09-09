"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
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
import { AdSpendDialog } from "@/components/crm/ad-spend-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { PagePagination } from "@/components/crm/list-pagination";
import {
  RecordCardsSkeleton,
  StatCardsSkeleton,
} from "@/components/crm/skeletons";
import { CrmGrid, type GridPageRequest } from "@/components/crm/grid/crm-grid";
import {
  buildAdSpendsColumnDefs,
  type AdSpendsGridActions,
} from "@/components/crm/grid/ad-spends-grid-columns";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { AdPlatform, AdSpendEntry } from "@/lib/data";
import { adSpendFromApi, fetchAdSpendsPage } from "@/lib/ad-spends-api";
import { formatDisplayTime } from "@/lib/lead-utils";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";

const platformsList: AdPlatform[] = [
  "Google Ads",
  "Meta Ads",
  "Website SEO",
  "Offline / Print",
  "Other",
];

const AD_SPENDS_PAGE_SIZE = 25;

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function formatSpendDateTime(date?: string, time?: string) {
  const dateValue = date?.trim();
  const parsedDate = dateValue
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? `${dateValue}T12:00:00` : dateValue)
    : null;
  if (!parsedDate || !Number.isFinite(parsedDate.getTime())) return null;

  return {
    date: parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: formatDisplayTime(time),
  };
}

function SpendDateTime({
  date,
  time,
  stacked = false,
}: {
  date?: string;
  time?: string;
  stacked?: boolean;
}) {
  const formatted = formatSpendDateTime(date, time);
  if (!formatted) return "—";
  if (!stacked) {
    return formatted.time ? `${formatted.date} · ${formatted.time}` : formatted.date;
  }
  return (
    <>
      <p>{formatted.date}</p>
      {formatted.time ? (
        <p className="font-mono-data text-[11px] text-slate-soft">{formatted.time}</p>
      ) : null}
    </>
  );
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
          {label}
          {count > 0 ? (
            <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 justify-center px-1.5">
              {count}
            </Badge>
          ) : null}
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
            <DropdownMenuItem className="text-slate" onSelect={() => onChange([])}>
              Clear {label.toLowerCase()}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function MarketingPage() {
  const { state, websites, adSpendsLoading, refreshAdSpends, addAdSpend, updateAdSpend, deleteAdSpend } =
    useData();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [platformFilter, setPlatformFilter] = React.useState<AdPlatform[]>([]);
  const [websiteFilter, setWebsiteFilter] = React.useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = React.useState<AdSpendEntry | null>(null);
  const canCreateAdSpend = useHasPermission("ad.spend.and.marketing.create");
  const canEditAdSpend = useHasPermission("ad.spend.and.marketing.edit");
  const canDeleteAdSpend = useHasPermission("ad.spend.and.marketing.delete");
  const [deleting, setDeleting] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pageSpends, setPageSpends] = React.useState<AdSpendEntry[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [listPagination, setListPagination] = React.useState({
    page: 1,
    pageSize: AD_SPENDS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const gridApiRef = React.useRef<GridApi<AdSpendEntry> | null>(null);
  const columnDefs = React.useMemo(() => buildAdSpendsColumnDefs(), []);
  const [isDesktop, setIsDesktop] = React.useState(false);

  const websiteDomains = React.useMemo(() => websites.map((w) => w.domain), [websites]);

  React.useEffect(() => {
    setWebsiteFilter((prev) => prev.filter((d) => websiteDomains.includes(d)));
  }, [websiteDomains.join("|")]);

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

  const adSpends = state.adSpends || [];
  const filterKey = `${debouncedQuery}|${platformFilter.join(",")}|${websiteFilter.join(",")}`;

  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const toolbarFilters = React.useMemo(
    () => ({
      search: debouncedQuery || undefined,
      platform: platformFilter.length ? platformFilter : undefined,
      website: websiteFilter.length ? websiteFilter : undefined,
    }),
    [debouncedQuery, platformFilter, websiteFilter]
  );

  const hasFilters =
    query.trim().length > 0 || platformFilter.length > 0 || websiteFilter.length > 0;

  const visibleSpends = adSpends.filter((s) => {
    const q = debouncedQuery.toLowerCase();
    if (q) {
      const matchCampaign = (s.campaignName ?? "").toLowerCase().includes(q);
      const matchNotes = (s.notes ?? "").toLowerCase().includes(q);
      const matchWeb = (s.website ?? "").toLowerCase().includes(q);
      const matchPlatform = s.platform.toLowerCase().includes(q);
      if (!matchCampaign && !matchNotes && !matchWeb && !matchPlatform) return false;
    }
    if (platformFilter.length > 0 && !platformFilter.includes(s.platform)) return false;
    if (websiteFilter.length > 0 && (!s.website || !websiteFilter.includes(s.website)))
      return false;
    return true;
  });

  const totalSpendSum = visibleSpends.reduce((acc, curr) => acc + curr.amount, 0);
  const googleSpendSum = visibleSpends
    .filter((s) => s.platform === "Google Ads")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const metaSpendSum = visibleSpends
    .filter((s) => s.platform === "Meta Ads")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const confirmedRevenue = state.bookings
    .filter((b) => b.status !== "Cancelled" && b.status !== "Refunded")
    .reduce((s, b) => s + b.total, 0);

  const costPerLead = state.leads.length > 0 ? Math.round(totalSpendSum / state.leads.length) : 0;
  const roasRatio = totalSpendSum > 0 ? (confirmedRevenue / totalSpendSum).toFixed(1) : "0.0";

  const loadSpendsPage = React.useCallback(async () => {
    setListLoading(true);
    try {
      const data = await fetchAdSpendsPage({
        ...toolbarFilters,
        page,
        pageSize: AD_SPENDS_PAGE_SIZE,
      });
      setPageSpends(data.adSpends.map(adSpendFromApi));
      setListPagination(data.pagination);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load ad spends",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setListLoading(false);
    }
  }, [toolbarFilters, page, toast]);

  React.useEffect(() => {
    if (isDesktop) return;
    void loadSpendsPage();
  }, [loadSpendsPage, isDesktop]);

  React.useEffect(() => {
    if (listPagination.totalPages > 0 && page > listPagination.totalPages) {
      setPage(listPagination.totalPages);
    }
  }, [listPagination.totalPages, page]);

  async function reloadSpends() {
    gridApiRef.current?.refreshInfiniteCache();
    if (!isDesktop) await loadSpendsPage();
    await refreshAdSpends();
  }

  const fetchGridPage = React.useCallback(
    async (request: GridPageRequest) => {
      const data = await fetchAdSpendsPage({
        ...toolbarFilters,
        page: request.page,
        pageSize: request.pageSize,
        sortBy: request.sortBy,
        sortDir: request.sortDir,
        colFilters: request.colFilters,
      });
      return {
        rows: data.adSpends.map(adSpendFromApi),
        total: data.pagination.total,
      };
    },
    [toolbarFilters]
  );

  async function handleCreate(data: Omit<AdSpendEntry, "id" | "createdAt">) {
    try {
      await addAdSpend(data);
      toast({
        variant: "success",
        title: "Ad Spend Logged",
        description: `Recorded ₹${data.amount.toLocaleString("en-IN")} for ${data.platform}.`,
      });
      void reloadSpends();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not log ad spend",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  async function handleUpdate(id: string, data: Omit<AdSpendEntry, "id" | "createdAt">) {
    try {
      await updateAdSpend(id, data);
      toast({
        variant: "success",
        title: "Ad Spend Updated",
        description: `Updated entry for ${data.platform}.`,
      });
      void reloadSpends();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update ad spend",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdSpend(deleteTarget.id);
      toast({
        variant: "info",
        title: "Ad Spend Deleted",
        description: "The spend entry was removed.",
      });
      setDeleteTarget(null);
      void reloadSpends();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not delete ad spend",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const gridActions = React.useMemo<AdSpendsGridActions>(
    () => ({
      canEditAdSpend,
      canDeleteAdSpend,
      onUpdate: handleUpdate,
      onDelete: (s) => setDeleteTarget(s),
    }),
    [canEditAdSpend, canDeleteAdSpend]
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
        title="Ad Spend & Marketing"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TableRefreshButton
              onRefresh={() => void reloadSpends()}
              loading={adSpendsLoading || listLoading}
            />
            {canCreateAdSpend ? (
              <AdSpendDialog
                trigger={
                  <Button variant="marigold">
                    <Plus className="size-4" /> Log Ad Spend
                  </Button>
                }
                onSubmit={handleCreate}
              />
            ) : null}
          </div>
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col overflow-hidden">
        {adSpendsLoading ? (
          <StatCardsSkeleton />
        ) : (
          <div className="mb-4 grid shrink-0 grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Recorded Spend</p>
                <p className="mt-1 font-display text-xl font-semibold text-ink-text">
                  ₹{totalSpendSum.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Google Ads Spend</p>
                <p className="mt-1 font-display text-xl font-semibold text-marigold-ink">
                  ₹{googleSpendSum.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Meta Ads Spend</p>
                <p className="mt-1 font-display text-xl font-semibold text-violet">
                  ₹{metaSpendSum.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Cost Per Lead / ROAS</p>
                <p className="mt-1 font-display text-xl font-semibold text-teal">
                  ₹{costPerLead.toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({roasRatio}x ROAS)
                  </span>
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
                  placeholder="Search campaigns, notes, domain…"
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <MultiFilter
                label="Platform"
                options={platformsList}
                selected={platformFilter}
                onChange={setPlatformFilter}
              />

              <MultiFilter
                label="Website"
                options={websiteDomains}
                selected={websiteFilter}
                onChange={setWebsiteFilter}
              />

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-slate"
                  onClick={() => {
                    setQuery("");
                    setPlatformFilter([]);
                    setWebsiteFilter([]);
                  }}
                >
                  <X className="size-3.5" /> Clear filters
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-soft">{listPagination.total} of {adSpends.length}</p>
          </div>

          <div className="relative hidden min-h-0 flex-1 md:block">
            <CrmGrid<AdSpendEntry>
              className="h-full min-h-[28rem]"
              columnDefs={columnDefs}
              fetchPage={fetchGridPage}
              toolbarKey={filterKey}
              storageKey="crm.ag.ad-spends.v1"
              context={gridActions}
              onGridApi={(api) => {
                gridApiRef.current = api;
              }}
              onError={(error) => {
                toast({
                  variant: "error",
                  title: "Could not load ad spends",
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
            {listLoading && pageSpends.length === 0 ? (
              <RecordCardsSkeleton count={4} />
            ) : pageSpends.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No ad spend records match the current filters.
              </p>
            ) : (
              pageSpends.map((s) => (
                <RecordCard key={s.id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-semibold break-words text-ink-text">
                      {s.campaignName || "General Marketing Budget"}
                    </p>
                    <Badge
                      variant={
                        s.platform === "Google Ads"
                          ? "marigold"
                          : s.platform === "Meta Ads"
                            ? "violet"
                            : "teal"
                      }
                    >
                      {s.platform}
                    </Badge>
                  </div>
                  <InfoGrid>
                    <InfoItem label="Website">{s.website || "—"}</InfoItem>
                    <InfoItem label="Date">
                      <SpendDateTime date={s.date} time={s.time} />
                    </InfoItem>
                    <InfoItem label="Amount">₹{s.amount.toLocaleString("en-IN")}</InfoItem>
                    {s.notes ? (
                      <InfoItem label="Notes" className="sm:col-span-2">
                        {s.notes}
                      </InfoItem>
                    ) : null}
                  </InfoGrid>
                  <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                    {canEditAdSpend ? (
                      <AdSpendDialog
                        spend={s}
                        trigger={
                          <Button size="sm" variant="outline">
                            <Pencil className="size-3.5" /> Edit
                          </Button>
                        }
                        onSubmit={(data) => handleUpdate(s.id, data)}
                      />
                    ) : null}
                    {canDeleteAdSpend ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-signal"
                        onClick={() => setDeleteTarget(s)}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(op) => {
          if (!op && !deleting) setDeleteTarget(null);
        }}
        title="Delete Ad Spend Entry"
        description={`Are you sure you want to remove the ad spend record for ₹${deleteTarget?.amount.toLocaleString("en-IN")} (${deleteTarget?.platform})?`}
        confirmLabel="Delete"
        confirming={deleting}
        closeOnConfirm={false}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
