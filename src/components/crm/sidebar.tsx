"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Car,
  ClipboardList,
  Route,
  Settings,
  Phone,
  Compass,
  BedDouble,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/itineraries", label: "Itineraries", icon: Route },
  { href: "/hotels", label: "Hotels", icon: BedDouble },
  { href: "/drivers", label: "Drivers & Vehicles", icon: Car },
  { href: "/calendar", label: "Trip Calendar", icon: CalendarDays },
  { href: "/calls", label: "Calls", icon: Phone },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink text-white lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex size-9 items-center justify-center rounded-md bg-marigold text-ink">
          <Compass className="size-5" strokeWidth={2.25} />
        </div>
        <div>
          <p className="font-display text-[15px] font-semibold leading-tight tracking-tight">
            Mahasu Travels
          </p>
          <p className="text-[11px] font-mono-data uppercase tracking-[0.16em] text-white/40">
            Dispatch CRM
          </p>
        </div>
      </div>

      <div className="route-line-v absolute top-0 left-[22px] h-16 opacity-0" />

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white",
                active && "bg-white/[0.08] text-white"
              )}
            >
              <span
                className={cn(
                  "absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-marigold transition-opacity",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon className="size-4" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <div className="route-line mb-3 opacity-20" />
        <Link
          href="/automation"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white",
            pathname === "/automation" && "bg-white/[0.08] text-white"
          )}
        >
          <Route className="size-4" strokeWidth={2} />
          Automation Rules
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white",
            pathname === "/settings" && "bg-white/[0.08] text-white"
          )}
        >
          <Settings className="size-4" strokeWidth={2} />
          Roles & Permissions
        </Link>

        <div className="mt-3 flex items-center gap-3 rounded-md bg-white/[0.05] px-3 py-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-marigold text-xs font-semibold text-marigold-ink">
            PA
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">Priya Anand</p>
            <p className="truncate text-[11px] text-white/40">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
