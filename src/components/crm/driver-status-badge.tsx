import { Badge } from "@/components/ui/badge";
import { Driver, statusColor } from "@/lib/data";
import { formatDriverStatusLabel } from "@/lib/driver-utils";

export function DriverStatusBadge({ status }: { status: Driver["status"] }) {
  const variant = (statusColor[status] ?? "secondary") as
    | "default"
    | "secondary"
    | "outline"
    | "marigold"
    | "teal"
    | "signal"
    | "violet";
  return <Badge variant={variant}>{formatDriverStatusLabel(status)}</Badge>;
}
