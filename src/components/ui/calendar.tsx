"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
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
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear() - 5, 0, 1);
  const defaultEnd = new Date(now.getFullYear() + 10, 11, 31);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth ?? defaultStart}
      endMonth={endMonth ?? defaultEnd}
      className={cn(
        "rdp-root p-2 [--rdp-accent-color:var(--ink)] [--rdp-accent-background-color:var(--marigold-soft)]",
        className
      )}
      classNames={{
        months: "relative flex flex-col",
        month: "space-y-3",
        month_caption: "flex h-9 items-center justify-center px-9",
        caption_label: "text-sm font-medium text-ink-text",
        dropdowns: "relative flex items-center justify-center gap-2",
        dropdown_root:
          "relative inline-flex items-center gap-0.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-ink-text shadow-xs",
        dropdown: "absolute inset-0 z-10 cursor-pointer opacity-0",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-7 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-[0.7rem] font-medium text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100"
        ),
        selected:
          "[&>button]:bg-ink [&>button]:text-white [&>button]:hover:bg-ink-soft [&>button]:hover:text-white",
        today: "[&>button]:bg-marigold-soft [&>button]:text-marigold-ink",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-40",
        disabled: "[&>button]:text-muted-foreground [&>button]:opacity-40",
        hidden: "invisible",
        ...classNames,
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
