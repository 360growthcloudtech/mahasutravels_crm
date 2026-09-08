"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function TableScrollArrows({
  scrollerRef,
}: {
  scrollerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const update = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(max - el.scrollLeft > 2);
  }, [scrollerRef]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const table = el.querySelector("table");
    if (table) ro.observe(table);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollerRef, update]);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(220, Math.round(el.clientWidth * 0.55));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  if (!canScrollLeft && !canScrollRight) return null;

  return (
    <>
      {canScrollLeft ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-40 flex items-center pl-1.5">
          <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Scroll table left"
            className="pointer-events-auto relative size-8 rounded-full bg-card shadow-md"
            onClick={() => scrollByDir(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      ) : null}
      {canScrollRight ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-40 flex items-center pr-1.5">
          <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Scroll table right"
            className="pointer-events-auto relative size-8 rounded-full bg-card shadow-md"
            onClick={() => scrollByDir(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </>
  );
}

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & { containerClassName?: string }) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className={cn("relative min-h-0 w-full", containerClassName, "overflow-hidden")}>
      <TableScrollArrows scrollerRef={scrollerRef} />
      <div ref={scrollerRef} className="h-full max-h-full w-full overflow-auto">
        <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
      </div>
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("[&_tr]:border-b [&_tr]:border-border [&_tr]:bg-secondary", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-border-soft transition-colors hover:bg-secondary/50", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 whitespace-nowrap bg-secondary px-3 text-left align-middle text-xs font-semibold tracking-wide text-slate first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td className={cn("px-3 py-3 align-middle break-words first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5", className)} {...props} />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
