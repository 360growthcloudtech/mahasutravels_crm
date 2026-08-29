"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ComboOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * Free-text + suggestion list for quote fields.
 * Suggestions render in normal document flow (not a body portal) so clicks work
 * inside Sheet/Dialog. Selection only updates the quote — never masters.
 */
export function ComboTextField({
  value,
  onChange,
  onPick,
  options,
  placeholder,
  emptyHint = "No matches — keep typing for a custom value",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onPick?: (option: ComboOption) => void;
  options: ComboOption[];
  placeholder?: string;
  emptyHint?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 80);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q) ||
          (o.description?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 80);
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  function commitText(next: string) {
    setQuery(next);
    onChange(next);
  }

  function pick(option: ComboOption) {
    setQuery(option.label);
    if (onPick) onPick(option);
    else onChange(option.value);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("w-full", className)}>
      <div className="relative flex w-full items-center">
        <Input
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            commitText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              return;
            }
            if (e.key === "Enter" && open && filtered[0]) {
              e.preventDefault();
              pick(filtered[0]);
            }
          }}
          className="pr-9"
          autoComplete="off"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        <button
          type="button"
          className="absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Show suggestions"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
          }}
        >
          <ChevronsUpDown className="size-3.5" />
        </button>
      </div>

      {open ? (
        <div
          role="listbox"
          className="mt-1 max-h-48 overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-1 shadow-sm"
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">{emptyHint}</p>
          ) : (
            filtered.map((option, index) => {
              const selected = option.value === value || option.label === value;
              return (
                <button
                  key={`${option.value}::${index}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                    selected && "bg-muted/70"
                  )}
                  onClick={() => pick(option)}
                >
                  <Check
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      selected ? "opacity-100 text-marigold" : "opacity-0"
                    )}
                  />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate font-medium text-foreground">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
