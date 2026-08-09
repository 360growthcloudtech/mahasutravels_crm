import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function RouteProgress({
  stages,
  current,
}: {
  stages: string[];
  current: number; // index of current stage
}) {
  return (
    <div className="flex items-center">
      {stages.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        const last = i === stages.length - 1;
        return (
          <div key={stage} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border-2 text-[9px] font-semibold",
                  done && "border-teal bg-teal text-white",
                  active && "border-marigold bg-marigold text-ink",
                  !done && !active && "border-border bg-card text-slate-soft"
                )}
              >
                {active ? <MapPin className="size-2.5" /> : done ? "✓" : ""}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-medium",
                  active ? "text-ink-text" : "text-slate-soft"
                )}
              >
                {stage}
              </span>
            </div>
            {!last && (
              <div
                className={cn(
                  "mx-1.5 mb-4 h-[2px] w-8",
                  done ? "bg-teal" : "route-line"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
