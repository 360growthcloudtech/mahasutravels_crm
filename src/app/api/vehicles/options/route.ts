import { NextResponse } from "next/server";
import { forbidUnlessAnyPermission, requireSession } from "@/lib/api-auth";
import { listApprovedVehicles } from "@/lib/db/drivers";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = forbidUnlessAnyPermission(session, [
    "leads.view",
    "leads.create",
    "leads.edit",
    "bookings.view",
    "bookings.create",
    "bookings.edit",
    "drivers.and.vehicles.view",
  ]);
  if (denied) return denied;

  const vehicles = await listApprovedVehicles();
  return NextResponse.json({ vehicles });
}
