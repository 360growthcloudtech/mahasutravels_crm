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
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/marketing", label: "Ad Spend & Marketing", icon: Megaphone },
  { href: "/assignments", label: "Booking & Drivers", icon: UserRound },
  { href: "/itineraries", label: "Itineraries", icon: Route },
  { href: "/hotels", label: "Hotels", icon: BedDouble },
  { href: "/drivers", label: "Drivers & Vehicles", icon: Car },
];

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
          {nav.map((item) => {
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

          <NavLabel collapsed={collapsed} label="Priya Anand · Super Admin">
            <div
              className={cn(
                "mt-3 flex items-center rounded-md bg-white/[0.05]",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marigold text-xs font-semibold text-marigold-ink">
                PA
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">Priya Anand</p>
                  <p className="truncate text-[11px] text-white/40">Super Admin</p>
                </div>
              ) : null}
            </div>
          </NavLabel>
        </div>
      </aside>
    </TooltipProvider>
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
