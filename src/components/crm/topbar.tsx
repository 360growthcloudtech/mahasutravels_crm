import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Topbar({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-paper/85 px-6 py-4 backdrop-blur-sm lg:px-8">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="font-mono-data text-[11px] uppercase tracking-[0.14em] text-slate-soft">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate font-display text-xl font-semibold text-ink-text">{title}</h1>
      </div>

      <div className="relative hidden w-72 md:block">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-soft" />
        <Input placeholder="Search leads, bookings, drivers…" className="pl-9" />
      </div>

      <button className="relative flex size-9 items-center justify-center rounded-md border border-border bg-card text-slate transition-colors hover:bg-secondary">
        <Bell className="size-4" />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-signal" />
      </button>

      {action}
    </header>
  );
}
