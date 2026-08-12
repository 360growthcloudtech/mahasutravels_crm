import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { listActiveItineraryPackages } from "@/lib/db/itineraries";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const packages = await listActiveItineraryPackages();
  return NextResponse.json({ packages });
}
