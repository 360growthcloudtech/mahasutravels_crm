"use client";

import { CircleUser, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type UserFilterOption = {
  id: string;
  name: string;
  role?: string;
};

interface UserFilterProps {
  value: string | null;
  users: UserFilterOption[];
  currentUserId?: string | null;
  onChange: (userId: string) => void;
}

export function UserFilter({ value, users, currentUserId, onChange }: UserFilterProps) {
  const selected = users.find((u) => u.id === value);
  const label = selected?.name ?? "Select user";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-full gap-2 px-3 text-xs font-medium sm:w-auto">
          <CircleUser className="size-3.5 text-muted-foreground text-teal" />
          <span className="max-w-[min(100%,14rem)] truncate sm:max-w-[140px]">{label}</span>
          <ChevronDown className="size-3 text-muted-foreground opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-64 overflow-y-auto p-1">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-muted-foreground">
          View dashboard by user
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No users found</p>
        ) : (
          users.map((u) => {
            const isSelected = value === u.id;
            const isYou = u.id === currentUserId;
            return (
              <DropdownMenuItem
                key={u.id}
                onClick={() => onChange(u.id)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-xs",
                  isSelected && "bg-accent font-medium text-accent-foreground"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-text">
                    {u.name}
                    {isYou ? (
                      <span className="ml-1 font-normal text-muted-foreground">(you)</span>
                    ) : null}
                  </p>
                  {u.role ? (
                    <p className="truncate text-[10px] text-muted-foreground">{u.role}</p>
                  ) : null}
                </div>
                {isSelected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
