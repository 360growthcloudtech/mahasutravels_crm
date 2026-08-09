import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { listActiveUsers } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await listActiveUsers();
  return NextResponse.json({ users });
}
