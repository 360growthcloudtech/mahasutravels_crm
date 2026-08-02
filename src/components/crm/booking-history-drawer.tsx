"use client";

import type { ComponentType } from "react";
import {
  History,
  MessageSquare,
  Pencil,
  RefreshCw,
  Share2,
  StickyNote,
  UserPlus,
  FileText,
  PlusCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/crm/status-badge";
import { Booking, LeadHistoryAction, LeadHistoryEvent } from "@/lib/data";
import { cn } from "@/lib/utils";

const actionMeta: Record<
  LeadHistoryAction,
  { icon: ComponentType<{ className?: string }>; tone: string }
> = {
  created: { icon: PlusCircle, tone: "bg-secondary text-slate" },
  status_changed: { icon: RefreshCw, tone: "bg-violet-soft text-violet" },
  updated: { icon: Pencil, tone: "bg-secondary text-slate" },
  comment_added: { icon: MessageSquare, tone: "bg-teal-soft text-teal" },
  assigned: { icon: UserPlus, tone: "bg-marigold-soft text-marigold-ink" },
  quoted: { icon: FileText, tone: "bg-marigold-soft text-marigold-ink" },
  whatsapp: { icon: Share2, tone: "bg-teal-soft text-teal" },
  note: { icon: StickyNote, tone: "bg-signal-soft text-signal" },
};

export function BookingHistoryDrawer({
  booking,
  open,
  onOpenChange,
}: {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const history = [...(booking?.history ?? [])].reverse();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4 text-slate" />
            Tracking history
          </SheetTitle>
          {booking && (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-text">{booking.customer}</span>
                <StatusBadge status={booking.status} />
              </div>
              <SheetDescription>
                {booking.id} · Dummy activity log for every action
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <SheetBody>
          {history.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
              <History className="mx-auto size-5 text-slate-soft" />
              <p className="mt-2 text-sm text-muted-foreground">No history yet</p>
              <p className="mt-0.5 text-xs text-slate-soft">Actions on this booking will appear here.</p>
            </div>
          ) : (
            <ol className="relative ml-3 space-y-0 border-l border-border-soft">
              {history.map((event, index) => (
                <HistoryItem key={event.id} event={event} isFirst={index === 0} />
              ))}
            </ol>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function HistoryItem({ event, isFirst }: { event: LeadHistoryEvent; isFirst: boolean }) {
  const meta = actionMeta[event.action] ?? actionMeta.note;
  const Icon = meta.icon;

  return (
    <li className="relative pb-5 pl-6 last:pb-0">
      <span
        className={cn(
          "absolute top-0 -left-3.5 flex size-7 items-center justify-center rounded-full border border-border bg-card",
          isFirst && "ring-2 ring-marigold/30"
        )}
      >
        <span className={cn("flex size-5 items-center justify-center rounded-full", meta.tone)}>
          <Icon className="size-3" />
        </span>
      </span>
      <div className="rounded-md border border-border-soft bg-secondary/30 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-ink-text">{event.label}</p>
          <span className="shrink-0 font-mono-data text-[10px] text-slate-soft">{event.createdAt}</span>
        </div>
        {event.detail ? <p className="mt-1 text-xs text-slate">{event.detail}</p> : null}
        <p className="mt-1.5 text-[11px] text-slate-soft">by {event.actor}</p>
      </div>
    </li>
  );
}
