import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { listActiveUsers, listUsers } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "1";
  const users = all ? await listUsers() : await listActiveUsers();
  return NextResponse.json({ users });
}
