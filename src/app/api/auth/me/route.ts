import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies, setSessionCookie } from "@/lib/auth-server";
import { listUserPermissionKeys } from "@/lib/db/permissions";

export const runtime = "nodejs";

/**
 * Returns the current user from the JWT by default (no DB).
 * Pass `?refresh=1` to reload permission grants from the DB and refresh the cookie.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  let permissions = session.permissions;

  if (refresh) {
    permissions = await listUserPermissionKeys(session.sub);
    const same =
      permissions.length === session.permissions.length &&
      permissions.every((k) => session.permissions.includes(k));

    if (!same) {
      await setSessionCookie({
        sub: session.sub,
        name: session.name,
        email: session.email,
        role: session.role,
        permissions,
      });
    }
  }

  return NextResponse.json({
    user: {
      id: session.sub,
      name: session.name,
      email: session.email,
      role: session.role,
      permission_keys: permissions,
    },
  });
}
