"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

import "react-day-picker/style.css";

function Calendar({
  className,
  classNames,
  components,
  showOutsideDays = true,
  captionLayout = "dropdown",
  startMonth,
  endMonth,
  style,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear() - 5, 0, 1);
  const defaultEnd = new Date(now.getFullYear() + 10, 11, 31);
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth ?? defaultStart}
      endMonth={endMonth ?? defaultEnd}
      className={cn("rdp-root p-2", className)}
      style={
        {
          "--rdp-accent-color": "var(--ink)",
          "--rdp-accent-background-color": "var(--marigold-soft)",
          "--rdp-range_start-color": "#fff",
          "--rdp-range_end-color": "#fff",
          ...style,
        } as React.CSSProperties
      }
      classNames={{
        ...defaults,
        ...classNames,
        months: cn(defaults.months, "relative flex flex-col", classNames?.months),
        month: cn(defaults.month, "space-y-3", classNames?.month),
        month_caption: cn(
          defaults.month_caption,
          "flex h-9 items-center justify-center px-9",
          classNames?.month_caption
        ),
        caption_label: cn(
          defaults.caption_label,
          "text-sm font-medium text-ink-text",
          classNames?.caption_label
        ),
        dropdowns: cn(
          defaults.dropdowns,
          "relative flex items-center justify-center gap-2",
          classNames?.dropdowns
        ),
        dropdown_root: cn(
          defaults.dropdown_root,
          "relative inline-flex items-center gap-0.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-ink-text shadow-xs",
          classNames?.dropdown_root
        ),
        dropdown: cn(
          defaults.dropdown,
          "absolute inset-0 z-10 cursor-pointer opacity-0",
          classNames?.dropdown
        ),
        nav: cn(
          defaults.nav,
          "absolute inset-x-0 top-0 flex items-center justify-between px-1",
          classNames?.nav
        ),
        button_previous: cn(
          defaults.button_previous,
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
          classNames?.button_previous
        ),
        button_next: cn(
          defaults.button_next,
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
          classNames?.button_next
        ),
        month_grid: cn(defaults.month_grid, "w-full border-collapse", classNames?.month_grid),
        weekdays: cn(defaults.weekdays, "flex", classNames?.weekdays),
        weekday: cn(
          defaults.weekday,
          "w-8 text-[0.7rem] font-medium text-muted-foreground",
          classNames?.weekday
        ),
        week: cn(defaults.week, "mt-1 flex w-full", classNames?.week),
        day: cn(defaults.day, "relative p-0 text-center text-sm", classNames?.day),
        day_button: cn(
          defaults.day_button,
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
          classNames?.day_button
        ),
        selected: cn(
          defaults.selected,
          "[&>button]:bg-ink [&>button]:text-white [&>button]:hover:bg-ink-soft [&>button]:hover:text-white",
          classNames?.selected
        ),
        today: cn(
          defaults.today,
          "[&>button]:bg-marigold-soft [&>button]:text-marigold-ink",
          classNames?.today
        ),
        outside: cn(
          defaults.outside,
          "[&>button]:text-muted-foreground [&>button]:opacity-40",
          classNames?.outside
        ),
        disabled: cn(
          defaults.disabled,
          "[&>button]:text-muted-foreground [&>button]:opacity-40",
          classNames?.disabled
        ),
        hidden: cn(defaults.hidden, "invisible", classNames?.hidden),
        range_start: cn(defaults.range_start, classNames?.range_start),
        range_end: cn(defaults.range_end, classNames?.range_end),
        range_middle: cn(defaults.range_middle, classNames?.range_middle),
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("size-4", chevronClass)} {...chevronProps} />;
        },
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
