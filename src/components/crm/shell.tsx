"use client";

import * as React from "react";
import { Sidebar, MobileNav, useSidebarCollapsed } from "@/components/crm/sidebar";
import { AuthGate } from "@/components/crm/auth-gate";
import { cn } from "@/lib/utils";

const MobileNavContext = React.createContext<() => void>(() => {});

export function useOpenMobileNav() {
  return React.useContext(MobileNavContext);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { collapsed, onCollapsedChange } = useSidebarCollapsed();
  const [ready, setReady] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  const openMobileNav = React.useCallback(() => setMobileOpen(true), []);

  return (
    <AuthGate>
      <div className="min-h-dvh bg-paper">
        <Sidebar collapsed={collapsed} onCollapsedChange={onCollapsedChange} animate={ready} />
        <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
        <div
          className={cn(
            "flex min-h-dvh min-w-0 flex-col",
            ready && "transition-[padding] duration-200 ease-out",
            collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64"
          )}
        >
          <MobileNavContext.Provider value={openMobileNav}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          </MobileNavContext.Provider>
        </div>
      </div>
    </AuthGate>
  );
}
