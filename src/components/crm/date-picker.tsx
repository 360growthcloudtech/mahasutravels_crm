"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function parseStoredDate(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }

  const withYear = parse(value, "d MMM yyyy", new Date());
  if (isValid(withYear)) return withYear;

  const noYear = parse(value, "d MMM", new Date());
  return isValid(noYear) ? noYear : undefined;
}

export function toStoredDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function formatDisplayDate(value?: string) {
  if (!value?.trim()) return "—";
  const d = parseStoredDate(value);
  if (!d) return value;
  return format(d, "d MMM");
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(() => selectedOrNow(value));
  const selected = parseStoredDate(value);

  React.useEffect(() => {
    if (open) setMonth(selectedOrNow(value));
  }, [open, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-start px-3 text-left font-normal shadow-xs",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 text-slate-soft" />
          {selected ? format(selected, "d MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(date) => {
            if (!date) {
              onChange("");
              return;
            }
            onChange(toStoredDate(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function selectedOrNow(value?: string) {
  return parseStoredDate(value) ?? new Date();
}
