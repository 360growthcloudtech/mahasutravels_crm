import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import {
  deleteUser,
  findUserById,
  setUserAutoAssignWebsites,
  updateUserProfile,
} from "@/lib/db/users";
import { resolveWebsiteDomain } from "@/lib/db/masters";
import {
  listUserPermissionKeys,
  replaceUserPermissions,
} from "@/lib/db/permissions";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions-catalog";
import { setSessionCookie } from "@/lib/auth-server";

export const runtime = "nodejs";

function parseAutoAssignWebsites(raw: unknown): string[] | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: "auto_assign_websites must be an array of strings" };
  }
  if (!raw.every((item) => typeof item === "string")) {
    return { error: "auto_assign_websites must be an array of strings" };
  }
  return [...new Set(raw.map((item) => item.trim()).filter(Boolean))];
}

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

  const hasProfile =
    "name" in body ||
    "email" in body ||
    "password" in body ||
    "role" in body ||
    "status" in body ||
    "phone" in body ||
    "department" in body;
  const hasWebsites = "auto_assign_websites" in body;
  const hasPerms = "permission_keys" in body;
  if (!hasProfile && !hasWebsites && !hasPerms) {
    return NextResponse.json(
      { error: "Provide profile fields, auto_assign_websites, and/or permission_keys" },
      { status: 400 }
    );
  }

  let user = {
    id: existing.id,
    name: existing.name,
    email: existing.email,
    role: existing.role,
    status: existing.status,
    phone: existing.phone?.trim() || "",
    department: existing.department?.trim() || "",
    auto_assign_websites: existing.auto_assign_websites,
  };

  if (hasProfile) {
    try {
      const updated = await updateUserProfile(id, {
        name: typeof body.name === "string" ? body.name : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        password: typeof body.password === "string" ? body.password : undefined,
        role: typeof body.role === "string" ? body.role : undefined,
        status: typeof body.status === "string" ? body.status : undefined,
        phone: typeof body.phone === "string" ? body.phone : undefined,
        department: typeof body.department === "string" ? body.department : undefined,
      });
      if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
      user = {
        ...user,
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        phone: updated.phone,
        department: updated.department,
        auto_assign_websites: updated.auto_assign_websites,
      };
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update profile" },
        { status: 400 }
      );
    }
  }

  if (hasWebsites) {
    const parsed = parseAutoAssignWebsites(body.auto_assign_websites);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const resolved: string[] = [];
    for (const item of parsed) {
      const domain = await resolveWebsiteDomain(item);
      if (!domain) {
        return NextResponse.json({ error: `Unknown or inactive website: ${item}` }, { status: 400 });
      }
      if (!resolved.includes(domain)) resolved.push(domain);
    }
    try {
      const updated = await setUserAutoAssignWebsites(id, resolved);
      if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
      user = updated;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update websites" },
        { status: 400 }
      );
    }
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

    if (id === session.sub) {
      await setSessionCookie({
        sub: session.sub,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: permissionKeys,
      });
    }
  } else if (hasProfile && id === session.sub) {
    await setSessionCookie({
      sub: session.sub,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: permissionKeys,
    });
  }

  return NextResponse.json({ user, permission_keys: permissionKeys });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "roles.and.permissions.delete");
  if (denied) return denied;

  const { id } = await context.params;
  if (id === session.sub) {
    return NextResponse.json(
      { error: "You cannot delete your own account while signed in." },
      { status: 400 }
    );
  }

  const existing = await findUserById(id);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const ok = await deleteUser(id);
    if (!ok) return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
