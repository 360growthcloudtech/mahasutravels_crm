import { NextResponse } from "next/server";
import { forbidUnlessAnyPermission, requireSession } from "@/lib/api-auth";
import { parseLeadsPagination, parseUsersListFilters } from "@/lib/api/list-filters";
import { listActiveUsers, listUsers, listUsersPage } from "@/lib/db/users";

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
