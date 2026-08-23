"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function ExportFilterChecklist<T extends string>({
  options,
  selected,
  onChange,
  formatOption,
  emptyText = "No options",
  className,
}: {
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  formatOption?: (value: T) => string;
  emptyText?: string;
  className?: string;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  }

  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  }

  return (
    <div className={cn("max-h-32 space-y-2 overflow-y-auto rounded-md border border-border-soft p-2", className)}>
      {options.map((option) => {
        const id = `export-filter-${option}`;
        return (
          <label
            key={option}
            htmlFor={id}
            className="flex cursor-pointer items-center gap-2 text-xs text-ink-text"
          >
            <Checkbox
              id={id}
              checked={selected.includes(option)}
              onCheckedChange={() => toggle(option)}
            />
            <span>{formatOption ? formatOption(option) : option}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Sync local filter state when dialog opens with latest list-page filters. */
export function useExportDialogFilters<T>(open: boolean, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [filters, setFilters] = React.useState(initial);
  React.useEffect(() => {
    if (open) setFilters(initial);
  }, [open, initial]);
  return [filters, setFilters];
}
