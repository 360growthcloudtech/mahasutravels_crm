import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { findUserById, setUserAutoAssignWebsite } from "@/lib/db/users";
import { resolveWebsiteDomain } from "@/lib/db/masters";

export const runtime = "nodejs";

const ADMIN_ROLES = new Set(["Super Admin", "Admin"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await findUserById(id);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!("auto_assign_website" in body)) {
    return NextResponse.json({ error: "auto_assign_website is required" }, { status: 400 });
  }

  const raw = body.auto_assign_website;
  let domain: string | null = null;
  if (raw === null || raw === "") {
    domain = null;
  } else if (typeof raw === "string") {
    const resolved = await resolveWebsiteDomain(raw);
    if (!resolved) {
      return NextResponse.json({ error: "Unknown or inactive website" }, { status: 400 });
    }
    domain = resolved;
  } else {
    return NextResponse.json({ error: "auto_assign_website must be a string or null" }, { status: 400 });
  }

  const user = await setUserAutoAssignWebsite(id, domain);
  return NextResponse.json({ user });
}
