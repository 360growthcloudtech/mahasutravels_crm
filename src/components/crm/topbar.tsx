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
import {
  fetchNotifications,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  type NotificationItem,
} from "@/lib/notifications-api";

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

const POLL_MS = 60_000;

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
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const openMobileNav = useOpenMobileNav();

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchNotifications();
        if (cancelled) return;
        setItems(data.items);
        setUnreadCount(data.unreadCount);
      } catch (err) {
        console.error("[notifications] load failed", err);
      }
    }

    void load();
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    function onFocus() {
      void load();
    }
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchNotifications();
        if (cancelled) return;
        setItems(data.items);
        setUnreadCount(data.unreadCount);
      } catch (err) {
        console.error("[notifications] load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function markAllRead() {
    setLoading(true);
    try {
      const nextUnread = await markAllNotificationsReadApi();
      setUnreadCount(nextUnread);
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (err) {
      console.error("[notifications] mark all read failed", err);
    } finally {
      setLoading(false);
    }
  }

  async function openItem(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    setOpen(false);
    try {
      const nextUnread = await markNotificationReadApi(id);
      setUnreadCount(nextUnread);
    } catch (err) {
      console.error("[notifications] mark read failed", err);
    }
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
            {items.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No notifications
              </p>
            ) : (
              items.map((n) => {
                const Icon = kindIcon[n.kind] ?? UserPlus;
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => void openItem(n.id)}
                    className={cn(
                      "flex gap-3 border-b border-border-soft px-5 py-3.5 transition-colors hover:bg-secondary/50",
                      n.unread && "bg-marigold-soft/30"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                        kindTone[n.kind] ?? kindTone.lead
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
              })
            )}
          </SheetBody>

          <SheetFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || unreadCount === 0}
              onClick={() => void markAllRead()}
            >
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
