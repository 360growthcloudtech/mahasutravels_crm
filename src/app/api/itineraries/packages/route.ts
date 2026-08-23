import { NextResponse } from "next/server";
import { forbidUnlessAnyPermission, requireSession } from "@/lib/api-auth";
import { listActiveItineraryPackages } from "@/lib/db/itineraries";

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
    "itineraries.view",
  ]);
  if (denied) return denied;

  const packages = await listActiveItineraryPackages();
  return NextResponse.json({ packages });
}
