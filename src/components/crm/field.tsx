import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
  className,
  hint,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-slate">{label}</Label>
      {children}
      {error ? (
        <p className="text-[11px] text-signal">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-soft">{hint}</p>
      ) : null}
    </div>
  );
}
