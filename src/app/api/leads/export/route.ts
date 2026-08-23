import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { hasLeadsExportFilters, parseLeadsListFilters } from "@/lib/api/list-filters";
import { csvResponse, exportFilename } from "@/lib/csv";
import { leadToDto, listLeads } from "@/lib/db/leads";
import { leadsToCsv } from "@/lib/export/leads-csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseLeadsListFilters(url.searchParams, session);
  const rows = await listLeads(filters);
  const dtos = rows.map(leadToDto);
  const csv = leadsToCsv(dtos);
  const filtered = hasLeadsExportFilters(url.searchParams);

  return csvResponse(csv, exportFilename("leads", filtered), { count: dtos.length });
}
