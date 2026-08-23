import { NextResponse } from "next/server";
import { forbidUnlessAnyPermission, requireSession } from "@/lib/api-auth";
import { listActiveUsers, listUsers } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessAnyPermission(session, [
    "leads.view",
    "leads.assign",
    "bookings.view",
    "roles.and.permissions.view",
  ]);
  if (denied) return denied;

  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "1";
  // Full member directory (inactive included) is settings-only.
  if (all) {
    const settingsDenied = forbidUnlessAnyPermission(session, ["roles.and.permissions.view"]);
    if (settingsDenied) return settingsDenied;
  }
  const users = all ? await listUsers() : await listActiveUsers();
  return NextResponse.json({ users });
}
