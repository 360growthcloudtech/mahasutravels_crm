"use client";

import * as React from "react";
import {
  format,
  isSameDay,
  startOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toStoredDate } from "@/components/crm/date-picker";

export type DashboardDateRange = {
  from: Date;
  to: Date;
} | null;

export type DateRangePresetId =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

const presets: { id: Exclude<DateRangePresetId, "custom">; label: string }[] = [
  { id: "all", label: "All Data" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
];

function rangeForPreset(
  id: Exclude<DateRangePresetId, "custom" | "all">,
  now = new Date()
): { from: Date; to: Date } {
  const today = startOfDay(now);
  switch (id) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = subDays(today, 1);
      return { from: y, to: y };
    }
    case "last7":
      return { from: subDays(today, 6), to: today };
    case "last30":
      return { from: subDays(today, 29), to: today };
    case "thisMonth":
      return { from: startOfMonth(today), to: today };
    case "lastMonth": {
      const prev = subMonths(today, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
  }
}

function detectPreset(range: DashboardDateRange): DateRangePresetId {
  if (!range?.from) return "all";
  const to = range.to ?? range.from;
  const today = startOfDay(new Date());

  for (const p of presets) {
    if (p.id === "all") continue;
    const expected = rangeForPreset(p.id, today);
    if (isSameDay(range.from, expected.from) && isSameDay(to, expected.to)) {
      return p.id;
    }
  }
  return "custom";
}

export function formatRangeLabel(range: DashboardDateRange) {
  if (!range?.from) return "All Data";
  const to = range.to ?? range.from;
  if (isSameDay(range.from, to)) return format(range.from, "d MMM yyyy");
  return `${format(range.from, "d MMM")} – ${format(to, "d MMM yyyy")}`;
}

/** Inclusive ISO date bounds for filtering stored yyyy-MM-dd values. */
export function rangeToISO(range: DashboardDateRange): { from: string; to: string } | null {
  if (!range?.from) return null;
  const to = range.to ?? range.from;
  return { from: toStoredDate(range.from), to: toStoredDate(to) };
}

export function isoInRange(iso: string, range: DashboardDateRange) {
  const bounds = rangeToISO(range);
  if (!bounds) return true;
  return iso >= bounds.from && iso <= bounds.to;
}

export function bookingOverlapsRange(
  booking: { travelDate: string; returnDate: string },
  range: DashboardDateRange
) {
  const bounds = rangeToISO(range);
  if (!bounds) return true;
  return booking.travelDate <= bounds.to && booking.returnDate >= bounds.from;
}

export function DateRangeFilter({
  value,
  onChange,
  className,
  align = "end",
}: {
  value: DashboardDateRange;
  onChange: (value: DashboardDateRange) => void;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(() => value?.from ?? new Date());
  const activePreset = detectPreset(value);

  React.useEffect(() => {
    if (open) setMonth(value?.from ?? new Date());
  }, [open, value]);

  function applyPreset(id: Exclude<DateRangePresetId, "custom">) {
    if (id === "all") {
      onChange(null);
      setOpen(false);
      return;
    }
    const next = rangeForPreset(id);
    onChange(next);
    setMonth(next.from);
  }

  function onSelect(next: DateRange | undefined) {
    if (!next?.from) {
      onChange(null);
      return;
    }
    onChange({ from: startOfDay(next.from), to: startOfDay(next.to ?? next.from) });
  }

  const selected: DateRange | undefined = value?.from
    ? { from: value.from, to: value.to ?? value.from }
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 min-w-[11rem] justify-between gap-2 px-3 font-normal shadow-xs",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-slate-soft" />
            <span className="truncate">{formatRangeLabel(value)}</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-slate-soft" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto overflow-hidden p-0 sm:min-w-[28rem]"
      >
        <div className="flex flex-col sm:flex-row">
          <div className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-border-soft p-2 sm:w-36 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0 sm:p-3">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                  activePreset === p.id
                    ? "bg-secondary font-medium text-ink-text"
                    : "text-slate hover:bg-secondary/70 hover:text-ink-text"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="p-2">
            <Calendar
              mode="range"
              numberOfMonths={1}
              captionLayout="label"
              weekStartsOn={1}
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={onSelect}
              modifiers={{
                weekend: { dayOfWeek: [0, 6] },
              }}
              modifiersClassNames={{
                weekend: "[&>button]:text-signal",
              }}
              classNames={{
                weekday:
                  "w-8 text-[0.7rem] font-medium text-muted-foreground [&:nth-child(6)]:text-signal [&:nth-child(7)]:text-signal",
                range_start:
                  "[&>button]:bg-ink [&>button]:text-white [&>button]:rounded-md",
                range_end:
                  "[&>button]:bg-ink [&>button]:text-white [&>button]:rounded-md",
                range_middle: "[&>button]:bg-secondary [&>button]:rounded-none",
                selected:
                  "[&>button]:bg-secondary [&>button]:text-ink-text [&>button]:hover:bg-secondary",
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
