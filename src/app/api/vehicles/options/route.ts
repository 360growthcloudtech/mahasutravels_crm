import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { listApprovedVehicles } from "@/lib/db/drivers";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehicles = await listApprovedVehicles();
  return NextResponse.json({ vehicles });
}
