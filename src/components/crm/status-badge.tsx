import { Badge } from "@/components/ui/badge";
import { statusColor } from "@/lib/data";

export function StatusBadge({ status }: { status: string }) {
  const variant = (statusColor[status] ?? "secondary") as
    | "default" | "secondary" | "outline" | "marigold" | "teal" | "signal" | "violet";
  return <Badge variant={variant}>{status}</Badge>;
}
