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
  const [editSpend, setEditSpend] = React.useState<AdSpendEntry | undefined>(undefined);

  const filteredSpends = (state.adSpends || []).filter(
    (s) => !selectedWebsite || !s.website || s.website === selectedWebsite
  );

  const totalSpendSum = filteredSpends.reduce((acc, curr) => acc + curr.amount, 0);

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
                onSubmit={(data) => {
                  addAdSpend(data);
                  toast({
                    variant: "success",
                    title: "Ad Spend Logged",
                    description: `Recorded ₹${data.amount.toLocaleString("en-IN")} for ${data.platform}.`,
                  });
                }}
              />
            </div>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 border dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <IndianRupee className="size-4 text-marigold-ink" />
                <span>Total Recorded Ad Spend</span>
              </div>
              <p className="font-display text-lg font-bold text-ink-text">
                ₹{totalSpendSum.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {filteredSpends.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No ad spend entries recorded yet. Click "Log Spend" to add one.
                </p>
              ) : (
                filteredSpends.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-slate-50/50 transition-colors gap-2"
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
                        <span className="text-[11px] text-muted-foreground">{s.date}</span>
                      </div>
                      {s.campaignName && (
                        <p className="text-xs font-medium text-ink-text">{s.campaignName}</p>
                      )}
                      {s.notes && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{s.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
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
                          className="size-7 hover:text-signal"
                          onClick={() => {
                            deleteAdSpend(s.id);
                            toast({
                              variant: "info",
                              title: "Entry Deleted",
                              description: "Ad spend record was removed.",
                            });
                          }}
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
