"use client";

import * as React from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trackedWebsites } from "@/lib/data";
import { cn } from "@/lib/utils";

interface WebsiteFilterProps {
  value: string | null;
  onChange: (website: string | null) => void;
}

export function WebsiteFilter({ value, onChange }: WebsiteFilterProps) {
  const activeWebsite = trackedWebsites.find((w) => w.name === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-full gap-2 px-3 text-xs font-medium sm:w-auto">
          <Globe className="size-3.5 text-muted-foreground text-teal" />
          <span className="max-w-[min(100%,14rem)] truncate sm:max-w-[140px]">
            {activeWebsite ? activeWebsite.name : "All Websites"}
          </span>
          <ChevronDown className="size-3 text-muted-foreground opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground font-normal">
          Filter by Website Domain
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className={cn(
            "flex items-center justify-between cursor-pointer rounded-md px-2 py-2 text-xs",
            !value && "bg-accent font-medium text-accent-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🌐</span>
            <div>
              <p className="font-medium text-ink-text">All Websites</p>
              <p className="text-[10px] text-muted-foreground">Aggregated 5 portals</p>
            </div>
          </div>
          {!value && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {trackedWebsites.map((w) => {
          const isSelected = value === w.name;
          return (
            <DropdownMenuItem
              key={w.id}
              onClick={() => onChange(w.name)}
              className={cn(
                "flex items-center justify-between cursor-pointer rounded-md px-2 py-2 text-xs",
                isSelected && "bg-accent font-medium text-accent-foreground"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{w.icon}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-text">{w.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{w.label}</p>
                </div>
              </div>
              {isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
