import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LEGACY_SESSION_COOKIE, SESSION_COOKIE, verifySessionToken } from "@/lib/auth-jwt";
import { homeHrefForRole } from "@/lib/nav-permissions";

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/leads")) return true;
  if (pathname.startsWith("/api/webhooks/leads")) return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname.startsWith("/proposal")) return true;
  if (pathname.startsWith("/api/proposal")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token =
    request.cookies.get(SESSION_COOKIE)?.value ||
    request.cookies.get(LEGACY_SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && (pathname === "/login" || pathname.startsWith("/login/"))) {
    const url = request.nextUrl.clone();
    url.pathname = homeHrefForRole(session.role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/" && session.role === "Employee") {
    const url = request.nextUrl.clone();
    url.pathname = homeHrefForRole(session.role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
