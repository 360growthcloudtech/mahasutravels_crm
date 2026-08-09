"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  IndianRupee,
  Target,
  TrendingUp,
  Globe,
  Megaphone,
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
import { AdSpendDialog } from "@/components/crm/ad-spend-dialog";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { AdPlatform, AdSpendEntry, trackedWebsites } from "@/lib/data";
import { InfoGrid, InfoItem, RecordCard } from "@/components/crm/record-card";

const platformsList: AdPlatform[] = [
  "Google Ads",
  "Meta Ads",
  "Website SEO",
  "Offline / Print",
  "Other",
];

const websiteNames = trackedWebsites.map((w) => w.name);

const stickyActionHead =
  "sticky right-0 top-0 z-30 min-w-[8.5rem] whitespace-nowrap border-l border-border-soft bg-card";
const stickyActionCell =
  "relative sticky right-0 z-20 min-w-[8.5rem] border-l border-border-soft bg-card before:absolute before:inset-0 before:-z-10 before:bg-card before:content-[''] group-hover:bg-secondary group-hover:before:bg-secondary";

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
  const { state, addAdSpend, updateAdSpend, deleteAdSpend } = useData();
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [platformFilter, setPlatformFilter] = React.useState<AdPlatform[]>([]);
  const [websiteFilter, setWebsiteFilter] = React.useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = React.useState<AdSpendEntry | null>(null);

  const adSpends = state.adSpends || [];

  const hasFilters =
    query.trim().length > 0 || platformFilter.length > 0 || websiteFilter.length > 0;

  const visibleSpends = adSpends.filter((s) => {
    const q = query.trim().toLowerCase();
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

  return (
    <Shell>
      <Topbar
        title="Ad Spend & Marketing"
        action={
          <AdSpendDialog
            trigger={
              <Button variant="marigold">
                <Plus className="size-4" /> Log Ad Spend
              </Button>
            }
            onSubmit={(data) => {
              addAdSpend(data);
              toast({
                variant: "success",
                title: "Ad Spend Logged",
                description: `Recorded ₹${data.amount.toLocaleString("en-IN")} for ${data.platform}.`,
              });
            }}
          />
        }
      />

      <main className="page-pad flex min-h-0 flex-1 flex-col overflow-hidden">
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
                <span className="text-xs font-normal text-muted-foreground">({roasRatio}x ROAS)</span>
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
                options={websiteNames}
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
          </div>

          <div className="hidden min-h-0 flex-1 md:block">
          <Table containerClassName="min-h-0 flex-1 overflow-auto">
            <TableHeader>
              <TableRow className="group hover:bg-transparent">
                <TableHead className="sticky top-0 z-20 bg-card">Platform</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Website Domain</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Campaign Name & Details</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card">Date</TableHead>
                <TableHead className="sticky top-0 z-20 bg-card text-right">Amount (₹)</TableHead>
                <TableHead className={`text-right ${stickyActionHead}`}>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleSpends.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No ad spend records match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                visibleSpends.map((s) => (
                  <TableRow key={s.id} className="group">
                    <TableCell>
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
                    </TableCell>

                    <TableCell className="text-sm text-slate">
                      {s.website ? (
                        <span className="inline-flex items-center gap-1">
                          🌐 {s.website}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="min-w-0 max-w-xs">
                      <p className="truncate text-sm font-medium text-ink-text">
                        {s.campaignName || "General Marketing Budget"}
                      </p>
                      {s.notes && (
                        <p className="truncate text-[11px] text-slate-soft">{s.notes}</p>
                      )}
                    </TableCell>

                    <TableCell className="text-sm text-slate">{s.date}</TableCell>

                    <TableCell className="whitespace-nowrap text-right font-mono-data text-sm font-semibold text-ink-text">
                      ₹{s.amount.toLocaleString("en-IN")}
                    </TableCell>

                    <TableCell className={`text-right ${stickyActionCell}`}>
                      <div className="flex items-center justify-end gap-1">
                        <AdSpendDialog
                          spend={s}
                          trigger={
                            <Button variant="ghost" size="icon" className="size-8">
                              <Pencil className="size-4 text-slate" />
                            </Button>
                          }
                          onSubmit={(data) => {
                            updateAdSpend(s.id, data);
                            toast({
                              variant: "success",
                              title: "Ad Spend Updated",
                              description: `Updated entry for ${data.platform}.`,
                            });
                          }}
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 hover:text-signal"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3 md:hidden">
            {visibleSpends.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No ad spend records match the current filters.
              </p>
            ) : (
              visibleSpends.map((s) => (
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
                    <InfoItem label="Date">{s.date}</InfoItem>
                    <InfoItem label="Amount">₹{s.amount.toLocaleString("en-IN")}</InfoItem>
                    {s.notes ? (
                      <InfoItem label="Notes" className="sm:col-span-2">
                        {s.notes}
                      </InfoItem>
                    ) : null}
                  </InfoGrid>
                  <div className="flex flex-wrap gap-1.5 border-t border-border-soft pt-3">
                    <AdSpendDialog
                      spend={s}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Pencil className="size-3.5" /> Edit
                        </Button>
                      }
                      onSubmit={(data) => {
                        updateAdSpend(s.id, data);
                        toast({
                          variant: "success",
                          title: "Ad Spend Updated",
                          description: `Updated entry for ${data.platform}.`,
                        });
                      }}
                    />
                    <Button size="sm" variant="outline" className="text-signal" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </div>
                </RecordCard>
              ))
            )}
          </div>
        </Card>
      </main>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(op) => {
          if (!op) setDeleteTarget(null);
        }}
        title="Delete Ad Spend Entry"
        description={`Are you sure you want to remove the ad spend record for ₹${deleteTarget?.amount.toLocaleString("en-IN")} (${deleteTarget?.platform})?`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) {
            deleteAdSpend(deleteTarget.id);
            toast({
              variant: "info",
              title: "Ad Spend Deleted",
              description: "The spend entry was removed.",
            });
            setDeleteTarget(null);
          }
        }}
      />
    </Shell>
  );
}
