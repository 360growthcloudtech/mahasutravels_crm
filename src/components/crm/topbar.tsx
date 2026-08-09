"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  ClipboardCheck,
  Menu,
  MessageSquare,
  Search,
  UserPlus,
} from "lucide-react";
import { useOpenMobileNav } from "@/components/crm/shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/crm/theme-toggle";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  href: string;
  unread: boolean;
  kind: "lead" | "booking" | "comment" | "trip";
};

const seedNotifications: NotificationItem[] = [
  {
    id: "N-1",
    title: "New lead · Ritika Sharma",
    detail: "Google Ads · Shimla Manali package enquiry",
    time: "6m ago",
    href: "/leads",
    unread: true,
    kind: "lead",
  },
  {
    id: "N-2",
    title: "Booking advance pending",
    detail: "BK-1201 · Naina Bhatia · Kasauli weekend",
    time: "28m ago",
    href: "/bookings",
    unread: true,
    kind: "booking",
  },
  {
    id: "N-3",
    title: "Driver reassigned",
    detail: "BK-1195 · Harsh Vardhan linked to Suresh Thakur",
    time: "1h ago",
    href: "/assignments",
    unread: true,
    kind: "trip",
  },
  {
    id: "N-4",
    title: "Comment on booking",
    detail: "Pooja Rawat · Customer will pay on pickup",
    time: "Yesterday",
    href: "/bookings",
    unread: false,
    kind: "comment",
  },
  {
    id: "N-5",
    title: "Lead confirmed",
    detail: "Ananya Rao moved to Confirmed · advance pending",
    time: "Yesterday",
    href: "/leads",
    unread: false,
    kind: "lead",
  },
  {
    id: "N-6",
    title: "Upcoming departure",
    detail: "BK-1181 · Manish Verma leaves 5 Aug",
    time: "2 days ago",
    href: "/bookings",
    unread: false,
    kind: "trip",
  },
];

const kindIcon = {
  lead: UserPlus,
  booking: ClipboardCheck,
  comment: MessageSquare,
  trip: CalendarCheck,
};

const kindTone = {
  lead: "bg-marigold-soft text-marigold-ink",
  booking: "bg-teal-soft text-teal",
  comment: "bg-violet-soft text-violet",
  trip: "bg-signal-soft text-signal",
};

export function Topbar({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState(seedNotifications);
  const unreadCount = items.filter((n) => n.unread).length;
  const openMobileNav = useOpenMobileNav();

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function openItem(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    setOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-paper/90 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={openMobileNav}
            aria-label="Open menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-slate transition-colors hover:bg-secondary lg:hidden"
          >
            <Menu className="size-4" />
          </button>

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="font-mono-data truncate text-[10px] tracking-[0.14em] text-slate-soft uppercase sm:text-[11px]">
                {eyebrow}
              </p>
            )}
            <h1 className="truncate font-display text-lg font-semibold text-ink-text sm:text-xl">
              {title}
            </h1>
          </div>

          <div className="relative hidden w-56 lg:block lg:w-72">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-soft" />
            <Input placeholder="Search leads, bookings, drivers…" className="pl-9" />
          </div>

          <ThemeToggle />

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open notifications"
            className="relative flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-slate transition-colors hover:bg-secondary"
          >
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-signal" />
            ) : null}
          </button>

          {action ? (
            <div className="ml-auto flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
              {action}
            </div>
          ) : null}
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <div className="flex items-start justify-between gap-3 pr-8">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Bell className="size-4 text-slate-soft" />
                  Notifications
                </SheetTitle>
                <SheetDescription>
                  {unreadCount > 0
                    ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                    : "You're all caught up"}
                </SheetDescription>
              </div>
              {unreadCount > 0 ? (
                <Badge variant="signal" className="shrink-0 font-normal">
                  {unreadCount} new
                </Badge>
              ) : null}
            </div>
          </SheetHeader>

          <SheetBody className="space-y-1 p-0">
            {items.map((n) => {
              const Icon = kindIcon[n.kind];
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => openItem(n.id)}
                  className={cn(
                    "flex gap-3 border-b border-border-soft px-5 py-3.5 transition-colors hover:bg-secondary/50",
                    n.unread && "bg-marigold-soft/30"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                      kindTone[n.kind]
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink-text">{n.title}</p>
                      {n.unread ? (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>
                    <p className="mt-1 font-mono-data text-[11px] text-slate-soft">{n.time}</p>
                  </div>
                </Link>
              );
            })}
          </SheetBody>

          <SheetFooter className="sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
