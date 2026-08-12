"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  confirming = false,
  closeOnConfirm = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirming?: boolean;
  /** When false, parent controls closing (e.g. after async delete). */
  closeOnConfirm?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (confirming) return;
        onOpenChange(next);
      }}
    >
      <SheetContent className="sm:max-w-sm">
        <SheetHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-signal-soft text-signal">
            <AlertTriangle className="size-4.5" />
          </div>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={confirming}
            onClick={() => {
              void Promise.resolve(onConfirm()).then(() => {
                if (closeOnConfirm) onOpenChange(false);
              });
            }}
          >
            {confirming ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {confirming ? "Deleting…" : confirmLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
