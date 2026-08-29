"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardList,
  Route,
  Settings,
  Compass,
  BedDouble,
  UserRound,
  CircleUser,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { logout, sessionAllows } from "@/lib/auth";
import { useSession } from "@/lib/session-context";
import { ROUTE_VIEW_PERMISSION } from "@/lib/nav-permissions";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";

export const crmNav = [
  {
    href: "/",
    label: "Main Dashboard",
    icon: LayoutDashboard,
    permission: ROUTE_VIEW_PERMISSION["/"],
    hideForRoles: ["Employee"] as const,
  },
  {
    href: "/employee-dashboard",
    label: "Employee Dashboard",
    icon: CircleUser,
    permission: ROUTE_VIEW_PERMISSION["/employee-dashboard"],
  },
  { href: "/leads", label: "Leads", icon: Users, permission: ROUTE_VIEW_PERMISSION["/leads"] },
  {
    href: "/bookings",
    label: "Bookings",
    icon: ClipboardList,
    permission: ROUTE_VIEW_PERMISSION["/bookings"],
  },
  {
    href: "/marketing",
    label: "Ad Spend & Marketing",
    icon: Megaphone,
    permission: ROUTE_VIEW_PERMISSION["/marketing"],
  },
  {
    href: "/assignments",
    label: "Booking & Drivers",
    icon: UserRound,
    permission: ROUTE_VIEW_PERMISSION["/assignments"],
  },
  {
    href: "/itineraries",
    label: "Itineraries",
    icon: Route,
    permission: ROUTE_VIEW_PERMISSION["/itineraries"],
  },
  { href: "/hotels", label: "Hotels", icon: BedDouble, permission: ROUTE_VIEW_PERMISSION["/hotels"] },
  {
    href: "/drivers",
    label: "Drivers & Vehicles",
    icon: Car,
    permission: ROUTE_VIEW_PERMISSION["/drivers"],
  },
] as const;

function navItemVisible(
  item: (typeof crmNav)[number],
  session: ReturnType<typeof useSession>["session"]
) {
  if (!sessionAllows(session, item.permission)) return false;
  const hiddenRoles = "hideForRoles" in item ? item.hideForRoles : undefined;
  if (hiddenRoles && session?.role && (hiddenRoles as readonly string[]).includes(session.role)) {
    return false;
  }
  return true;
}

const STORAGE_KEY = "mahasu-sidebar-collapsed";
let collapsedCache: boolean | null = null;

function readCollapsedFromStorage(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  if (collapsedCache !== null) return collapsedCache;
  collapsedCache = readCollapsedFromStorage();
  return collapsedCache;
}

function writeCollapsed(next: boolean) {
  collapsedCache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // ignore
  }
}

function NavLabel({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean;
  label: string;
  children: React.ReactElement;
}) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  animate = true,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  animate?: boolean;
}) {
  const pathname = usePathname();
  const { session } = useSession();

  const displayName = session?.name ?? "Priya Anand";
  const displayRole = session?.role ?? "Super Admin";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const visibleNav = crmNav.filter((item) => navItemVisible(item, session));
  const canViewSettings = sessionAllows(session, ROUTE_VIEW_PERMISSION["/settings"]);

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-ink text-white lg:flex",
          animate && "transition-[width] duration-200 ease-out",
          collapsed ? "w-[4.5rem]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex items-center py-5",
            collapsed ? "justify-center px-2" : "gap-2.5 px-5"
          )}
        >
          <NavLabel collapsed={collapsed} label="Mahasu Travels">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-marigold text-ink">
              <Compass className="size-5" strokeWidth={2.25} />
            </div>
          </NavLabel>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold leading-tight tracking-tight">
                Mahasu Travels
              </p>
              <p className="text-[11px] font-mono-data uppercase tracking-[0.16em] text-white/40">
                Dispatch CRM
              </p>
            </div>
          ) : null}
        </div>

        <nav
          className={cn(
            "flex flex-1 flex-col gap-0.5 py-2",
            collapsed ? "px-2" : "px-3"
          )}
        >
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <NavLabel key={item.href} collapsed={collapsed} label={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center rounded-md py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    active && "bg-white/[0.08] text-white"
                  )}
                >
                  {!collapsed ? (
                    <span
                      className={cn(
                        "absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-marigold transition-opacity",
                        active ? "opacity-100" : "opacity-0"
                      )}
                    />
                  ) : null}
                  <Icon className="size-4 shrink-0" strokeWidth={2} />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              </NavLabel>
            );
          })}
        </nav>

        <div className={cn("pb-3", collapsed ? "px-2" : "px-3")}>
          <div className={cn("route-line mb-3 opacity-20", collapsed && "mx-1")} />

          {canViewSettings ? (
            <NavLabel collapsed={collapsed} label="Roles & Permissions">
              <Link
                href="/settings"
                className={cn(
                  "flex items-center rounded-md py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  pathname === "/settings" && "bg-white/[0.08] text-white"
                )}
              >
                <Settings className="size-4 shrink-0" strokeWidth={2} />
                {!collapsed ? <span className="truncate">Roles & Permissions</span> : null}
              </Link>
            </NavLabel>
          ) : null}

          <NavLabel
            collapsed={collapsed}
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <button
              type="button"
              onClick={() => onCollapsedChange(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "mt-1 flex w-full items-center rounded-md py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white",
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4 shrink-0" strokeWidth={2} />
              ) : (
                <>
                  <PanelLeftClose className="size-4 shrink-0" strokeWidth={2} />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </NavLabel>

          <NavLabel collapsed={collapsed} label={`${displayName} · ${displayRole}`}>
            <div
              className={cn(
                "mt-3 flex items-center rounded-md bg-white/[0.05]",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marigold text-xs font-semibold text-ink">
                {initials}
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">{displayName}</p>
                  <p className="truncate text-[11px] text-white/40">{displayRole}</p>
                </div>
              ) : null}
            </div>
          </NavLabel>

          <NavLabel collapsed={collapsed} label="Logout">
            <button
              type="button"
              onClick={logout}
              className={cn(
                "mt-1 flex w-full items-center rounded-md py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white",
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              )}
            >
              <LogOut className="size-4 shrink-0" strokeWidth={2} />
              {!collapsed ? <span>Logout</span> : null}
            </button>
          </NavLabel>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export function MobileNav({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const { session } = useSession();

  const displayName = session?.name ?? "Priya Anand";
  const displayRole = session?.role ?? "Super Admin";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const visibleNav = crmNav.filter((item) => navItemVisible(item, session));
  const canViewSettings = sessionAllows(session, ROUTE_VIEW_PERMISSION["/settings"]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(20rem,100%)] bg-ink p-0 text-white sm:max-w-xs">
        <SheetHeader className="border-white/10 px-4 py-5 pr-12">
          <SheetTitle className="flex items-center gap-2.5 text-white">
            <span className="flex size-9 items-center justify-center rounded-md bg-marigold text-ink">
              <Compass className="size-5" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 text-left">
              <span className="block font-display text-[15px] font-semibold leading-tight">
                Mahasu Travels
              </span>
              <span className="block font-mono-data text-[11px] font-normal tracking-[0.16em] text-white/40 uppercase">
                Dispatch CRM
              </span>
            </span>
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-0.5 px-3 py-3">
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white",
                  active && "bg-white/[0.1] text-white"
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={2} />
                <span className="break-words">{item.label}</span>
              </Link>
            );
          })}
          <div className="route-line my-3 opacity-20" />
          {canViewSettings ? (
            <Link
              href="/settings"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white",
                pathname === "/settings" && "bg-white/[0.1] text-white"
              )}
            >
              <Settings className="size-4 shrink-0" strokeWidth={2} />
              Roles & Permissions
            </Link>
          ) : null}
          <div className="mt-3 flex items-center gap-3 rounded-md bg-white/[0.05] px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marigold text-xs font-semibold text-ink">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{displayName}</p>
              <p className="truncate text-[11px] text-white/40">{displayRole}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <LogOut className="size-4 shrink-0" strokeWidth={2} />
            Logout
          </button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = React.useState(() => readCollapsed());

  React.useLayoutEffect(() => {
    setCollapsed(readCollapsed());

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      collapsedCache = null;
      setCollapsed(readCollapsed());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const onCollapsedChange = React.useCallback((next: boolean) => {
    writeCollapsed(next);
    setCollapsed(next);
  }, []);

  return { collapsed, onCollapsedChange };
}
