import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { parseLeadsPagination, parsePermissionsListFilters } from "@/lib/api/list-filters";
import {
  listPermissions,
  listPermissionsPage,
  listUserPermissionKeys,
  permissionToDto,
} from "@/lib/db/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const { page, pageSize, paginated } = parseLeadsPagination(url.searchParams);
  const filters = parsePermissionsListFilters(url.searchParams);

  const myKeysPromise = listUserPermissionKeys(session.sub);

  if (!paginated) {
    const [permissions, myKeys] = await Promise.all([
      listPermissions(true),
      myKeysPromise,
    ]);
    return NextResponse.json({
      permissions: permissions.map(permissionToDto),
      my_permission_keys: myKeys,
    });
  }

  const offset = (page - 1) * pageSize;
  const [result, myKeys] = await Promise.all([
    listPermissionsPage(filters, { limit: pageSize, offset }),
    myKeysPromise,
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize) || 1);

  return NextResponse.json({
    permissions: result.rows.map(permissionToDto),
    my_permission_keys: myKeys,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages,
      hasMore: page * pageSize < result.total,
    },
  });
}
