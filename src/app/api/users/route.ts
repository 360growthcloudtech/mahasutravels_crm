import { NextResponse } from "next/server";
import { forbidUnlessAnyPermission, forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import { parseLeadsPagination, parseUsersListFilters } from "@/lib/api/list-filters";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions-catalog";
import { resolveWebsiteDomain } from "@/lib/db/masters";
import { replaceUserPermissions } from "@/lib/db/permissions";
import {
  createUser,
  listActiveUsers,
  listUsers,
  listUsersPage,
  setUserAutoAssignWebsites,
} from "@/lib/db/users";

export const runtime = "nodejs";

function parseStringArray(raw: unknown, field: string): string[] | { error: string } {
  if (!Array.isArray(raw)) return { error: `${field} must be an array of strings` };
  if (!raw.every((item) => typeof item === "string")) {
    return { error: `${field} must be an array of strings` };
  }
  return [...new Set(raw.map((item) => item.trim()).filter(Boolean))];
}

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
  const includeInactive =
    all || url.searchParams.get("include_inactive") === "1";
  // Full member directory (inactive included) is settings-only.
  if (includeInactive) {
    const settingsDenied = forbidUnlessAnyPermission(session, ["roles.and.permissions.view"]);
    if (settingsDenied) return settingsDenied;
  }

  const { page, pageSize, paginated } = parseLeadsPagination(url.searchParams);
  const filters = parseUsersListFilters(url.searchParams);
  filters.includeInactive = includeInactive;

  // `all=1` keeps the legacy unpaginated directory response.
  if (!paginated || all) {
    const users = includeInactive ? await listUsers() : await listActiveUsers();
    return NextResponse.json({ users });
  }

  const offset = (page - 1) * pageSize;
  const result = await listUsersPage(filters, { limit: pageSize, offset });
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize) || 1);

  return NextResponse.json({
    users: result.rows,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages,
      hasMore: page * pageSize < result.total,
    },
  });
}

/** Invite / create a CRM login member. */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "roles.and.permissions.create");
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "Employee";
  const status = typeof body.status === "string" ? body.status : "Active";
  const phone = typeof body.phone === "string" ? body.phone : "";
  const department = typeof body.department === "string" ? body.department : "";

  let user;
  try {
    user = await createUser({ name, email, password, role, status, phone, department });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 400 }
    );
  }

  if ("auto_assign_websites" in body) {
    const parsed = parseStringArray(body.auto_assign_websites, "auto_assign_websites");
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
      const updated = await setUserAutoAssignWebsites(user.id, resolved);
      if (updated) user = updated;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to save websites" },
        { status: 400 }
      );
    }
  }

  let permissionKeys: string[] = [];
  if ("permission_keys" in body) {
    const parsed = parseStringArray(body.permission_keys, "permission_keys");
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const allowed = new Set(ALL_PERMISSION_KEYS);
    const invalid = parsed.filter((k) => !allowed.has(k));
    if (invalid.length) {
      return NextResponse.json(
        { error: `Unknown permission keys: ${invalid.slice(0, 5).join(", ")}` },
        { status: 400 }
      );
    }
    permissionKeys = await replaceUserPermissions(user.id, parsed);
  }

  return NextResponse.json({ user, permission_keys: permissionKeys }, { status: 201 });
}
