"use client";

import * as React from "react";
import { Sidebar, useSidebarCollapsed } from "@/components/crm/sidebar";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const { collapsed, onCollapsedChange } = useSidebarCollapsed();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <Sidebar collapsed={collapsed} onCollapsedChange={onCollapsedChange} animate={ready} />
      <div
        className={cn(
          ready && "transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64"
        )}
      >
        {children}
      </div>
    </div>
  );
}
