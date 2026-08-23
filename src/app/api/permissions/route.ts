import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { listPermissions, listUserPermissionKeys, permissionToDto } from "@/lib/db/permissions";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [permissions, myKeys] = await Promise.all([
    listPermissions(true),
    listUserPermissionKeys(session.sub),
  ]);

  return NextResponse.json({
    permissions: permissions.map(permissionToDto),
    my_permission_keys: myKeys,
  });
}
