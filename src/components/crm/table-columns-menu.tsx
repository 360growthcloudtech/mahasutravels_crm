"use client";

import { Columns3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { TableColumnDef } from "@/lib/use-table-column-layout";

export function TableColumnsMenu({
  columns,
  isHidden,
  onToggle,
  onReset,
  isDirty,
}: {
  columns: TableColumnDef[];
  isHidden: (id: string) => boolean;
  onToggle: (id: string) => void;
  onReset: () => void;
  isDirty: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal">
          <Columns3 className="size-3.5 text-slate-soft" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={!isHidden(column.id)}
            disabled={column.locked}
            onCheckedChange={() => onToggle(column.id)}
            onSelect={(event) => event.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        {isDirty ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-slate" onSelect={onReset}>
              <RotateCcw className="size-3.5" />
              Reset layout
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
