"use client";

import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toTimeOnly } from "@/lib/lead-utils";
import { cn } from "@/lib/utils";

type Meridiem = "AM" | "PM";

function parseParts(value: string): { hour12: number; minute: number; meridiem: Meridiem } | null {
  const time = toTimeOnly(value);
  if (!time) return null;
  const [h24, minute] = time.split(":").map(Number);
  const meridiem: Meridiem = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour12, minute, meridiem };
}

function toHHmm(hour12: number, minute: number, meridiem: Meridiem): string {
  let h24 = hour12 % 12;
  if (meridiem === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export function TimePicker({
  value,
  onChange,
  className,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const parts = parseParts(value);
  const minuteOptions = React.useMemo(() => {
    const set = new Set(MINUTES);
    if (parts) set.add(parts.minute);
    return [...set].sort((a, b) => a - b);
  }, [parts]);

  const hour12 = parts?.hour12 ?? 12;
  const minute = parts?.minute ?? 0;
  const meridiem = parts?.meridiem ?? "AM";

  function emit(nextHour: number, nextMinute: number, nextMeridiem: Meridiem) {
    onChange(toHHmm(nextHour, nextMinute, nextMeridiem));
  }

  return (
    <div className={cn("grid grid-cols-[1fr_1fr_auto] gap-1.5", className)}>
      <Select
        value={parts ? String(hour12) : undefined}
        disabled={disabled}
        onValueChange={(v) => emit(Number(v), minute, meridiem)}
      >
        <SelectTrigger aria-label="Hour">
          <SelectValue placeholder="Hour" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={parts ? String(minute).padStart(2, "0") : undefined}
        disabled={disabled}
        onValueChange={(v) => emit(hour12, Number(v), meridiem)}
      >
        <SelectTrigger aria-label="Minute">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {minuteOptions.map((m) => (
            <SelectItem key={m} value={String(m).padStart(2, "0")}>
              {String(m).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={parts ? meridiem : undefined}
        disabled={disabled}
        onValueChange={(v) => emit(hour12, minute, v as Meridiem)}
      >
        <SelectTrigger className="w-[4.5rem]" aria-label="AM or PM">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
