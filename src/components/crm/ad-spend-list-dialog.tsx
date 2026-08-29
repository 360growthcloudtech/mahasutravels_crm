"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, IndianRupee } from "lucide-react";
import { AdSpendEntry } from "@/lib/data";
import { formatDisplayTime } from "@/lib/lead-utils";
import { formatDisplayDate } from "@/components/crm/date-picker";
import { AdSpendDialog } from "@/components/crm/ad-spend-dialog";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";

export function AdSpendListDialog({
  trigger,
  selectedWebsite,
}: {
  trigger: React.ReactNode;
  selectedWebsite?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const { state, addAdSpend, updateAdSpend, deleteAdSpend } = useData();
  const { toast } = useToast();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filteredSpends = (state.adSpends || []).filter(
    (s) => !selectedWebsite || !s.website || s.website === selectedWebsite
  );

  const totalSpendSum = filteredSpends.reduce((acc, curr) => acc + curr.amount, 0);

  async function handleCreate(data: Omit<AdSpendEntry, "id" | "createdAt">) {
    try {
      await addAdSpend(data);
      toast({
        variant: "success",
        title: "Ad Spend Logged",
        description: `Recorded ₹${data.amount.toLocaleString("en-IN")} for ${data.platform}.`,
      });
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
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update ad spend",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  }

  async function handleDelete(spend: AdSpendEntry) {
    setBusyId(spend.id);
    try {
      await deleteAdSpend(spend.id);
      toast({
        variant: "info",
        title: "Entry Deleted",
        description: "Ad spend record was removed.",
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not delete ad spend",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle>Ad Spend Management</DialogTitle>
                <DialogDescription>
                  Review, edit, or manually log ad campaign spend across platforms.
                </DialogDescription>
              </div>
              <AdSpendDialog
                trigger={
                  <Button variant="marigold" size="sm" className="gap-1.5 text-xs">
                    <Plus className="size-3.5" /> Log Spend
                  </Button>
                }
                onSubmit={handleCreate}
              />
            </div>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-3 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <IndianRupee className="size-4 text-marigold-ink" />
                <span>Total Recorded Ad Spend</span>
              </div>
              <p className="font-display text-lg font-bold text-ink-text">
                ₹{totalSpendSum.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {filteredSpends.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No ad spend entries recorded yet. Click &quot;Log Spend&quot; to add one.
                </p>
              ) : (
                filteredSpends.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col justify-between gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
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
                        {s.website && (
                          <span className="text-[11px] text-slate-soft">🌐 {s.website}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {formatDisplayDate(s.date)}
                          {s.time ? ` · ${formatDisplayTime(s.time)}` : ""}
                        </span>
                      </div>
                      {s.campaignName && (
                        <p className="text-xs font-medium text-ink-text">{s.campaignName}</p>
                      )}
                      {s.notes && (
                        <p className="line-clamp-1 text-[11px] text-muted-foreground">{s.notes}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <span className="font-mono-data text-sm font-semibold text-ink-text">
                        ₹{s.amount.toLocaleString("en-IN")}
                      </span>
                      <div className="flex items-center gap-1">
                        <AdSpendDialog
                          spend={s}
                          trigger={
                            <Button variant="ghost" size="icon" className="size-7">
                              <Pencil className="size-3.5 text-slate-soft" />
                            </Button>
                          }
                          onSubmit={(data) => handleUpdate(s.id, data)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 hover:text-signal"
                          disabled={busyId === s.id}
                          onClick={() => void handleDelete(s)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
