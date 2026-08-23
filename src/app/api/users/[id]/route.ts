import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import { findUserById, setUserAutoAssignWebsite } from "@/lib/db/users";
import { resolveWebsiteDomain } from "@/lib/db/masters";
import {
  listUserPermissionKeys,
  replaceUserPermissions,
} from "@/lib/db/permissions";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions-catalog";
import { setSessionCookie } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "roles.and.permissions.edit");
  if (denied) return denied;

  const { id } = await context.params;
  const existing = await findUserById(id);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const hasWebsite = "auto_assign_website" in body;
  const hasPerms = "permission_keys" in body;
  if (!hasWebsite && !hasPerms) {
    return NextResponse.json(
      { error: "Provide auto_assign_website and/or permission_keys" },
      { status: 400 }
    );
  }

  let user = {
    id: existing.id,
    name: existing.name,
    email: existing.email,
    role: existing.role,
    status: existing.status,
    auto_assign_website: existing.auto_assign_website,
  };

  if (hasWebsite) {
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
      return NextResponse.json(
        { error: "auto_assign_website must be a string or null" },
        { status: 400 }
      );
    }
    const updated = await setUserAutoAssignWebsite(id, domain);
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
    user = updated;
  }

  let permissionKeys = await listUserPermissionKeys(id);
  if (hasPerms) {
    const raw = body.permission_keys;
    if (!Array.isArray(raw) || !raw.every((k) => typeof k === "string")) {
      return NextResponse.json(
        { error: "permission_keys must be an array of strings" },
        { status: 400 }
      );
    }
    const allowed = new Set(ALL_PERMISSION_KEYS);
    const invalid = raw.filter((k) => !allowed.has(k));
    if (invalid.length) {
      return NextResponse.json(
        { error: `Unknown permission keys: ${invalid.slice(0, 5).join(", ")}` },
        { status: 400 }
      );
    }
    permissionKeys = await replaceUserPermissions(id, raw);

    // Keep the editor's JWT in sync if they edited their own grants.
    if (id === session.sub) {
      await setSessionCookie({
        sub: session.sub,
        name: session.name,
        email: session.email,
        role: session.role,
        permissions: permissionKeys,
      });
    }
  }

  return NextResponse.json({ user, permission_keys: permissionKeys });
}
