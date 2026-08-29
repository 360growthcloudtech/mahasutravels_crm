import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { findLeadById } from "@/lib/db/leads";
import {
  findLatestDraftLeadQuote,
  findLatestSentLeadQuote,
} from "@/lib/db/lead-quotes";
import { formatLeadNo } from "@/lib/lead-utils";

export const runtime = "nodejs";

/**
 * Public proposal payload.
 * - Guests get the latest Sent quote only.
 * - Authenticated users with ?preview=1 can also see Draft.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await context.params;
  const lead = await findLeadById(leadId);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "1";
  const session = await getSessionFromCookies();

  let quote = await findLatestSentLeadQuote(leadId);
  if (!quote && preview && session) {
    if (session.role === "Employee" && lead.assigned_to !== session.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    quote = await findLatestDraftLeadQuote(leadId);
  }

  return NextResponse.json({
    lead: {
      id: lead.id,
      lead_no: formatLeadNo(lead.lead_no),
      name: lead.name,
      assigned_to:
        lead.assigned_to && lead.assigned_to_name
          ? { id: lead.assigned_to, name: lead.assigned_to_name }
          : null,
    },
    quote,
  });
}
