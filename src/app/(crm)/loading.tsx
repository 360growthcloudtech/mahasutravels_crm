import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CrmLoading() {
  return (
    <div className="page-pad flex min-h-0 flex-1 flex-col">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-border-soft py-3 last:border-0"
            >
              <Skeleton className="size-8 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-[42%]" />
                <Skeleton className="h-2.5 w-[24%]" />
              </div>
              <Skeleton className="hidden h-3 w-20 sm:block" />
              <Skeleton className="hidden h-3 w-16 md:block" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
