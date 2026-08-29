import type { LeadQuoteDto, LeadQuoteInput } from "@/lib/quote-defaults";

export type { LeadQuoteDto, LeadQuoteInput };

function quoteBody(input: LeadQuoteInput) {
  return {
    greeting: input.greeting,
    intro_text: input.intro_text,
    company_contact_name: input.company_contact_name,
    company_contact_phone: input.company_contact_phone,
    destination: input.destination,
    duration_label: input.duration_label,
    vehicle_label: input.vehicle_label,
    amount: input.amount,
    amount_note: input.amount_note,
    inclusions: input.inclusions,
    exclusions: input.exclusions,
    terms: input.terms,
    guest_name: input.guest_name,
    guest_phone: input.guest_phone,
    guest_email: input.guest_email,
    adults: input.adults,
    kids: input.kids,
    kids_note: input.kids_note,
    travel_date: input.travel_date,
    return_date: input.return_date,
    pickup: input.pickup,
    dropoff: input.dropoff,
    tour_title: input.tour_title,
    tour_subtitle: input.tour_subtitle,
    days: input.days,
    hotels: input.hotels,
    note: input.note,
  };
}

export async function fetchLeadQuote(leadId: string): Promise<LeadQuoteDto | null> {
  const res = await fetch(`/api/leads/${leadId}/quote`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load quote");
  const data = (await res.json()) as { quote?: LeadQuoteDto | null };
  return data.quote ?? null;
}

export async function saveLeadQuoteDraft(
  leadId: string,
  input: LeadQuoteInput
): Promise<LeadQuoteDto> {
  const res = await fetch(`/api/leads/${leadId}/quote`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quoteBody(input)),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to save quote draft");
  }
  const data = (await res.json()) as { quote: LeadQuoteDto };
  return data.quote;
}

export async function sendLeadQuoteApi(
  leadId: string,
  input: LeadQuoteInput
): Promise<LeadQuoteDto> {
  const res = await fetch(`/api/leads/${leadId}/quote/send`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quoteBody(input)),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to send quote");
  }
  const data = (await res.json()) as { quote: LeadQuoteDto };
  return data.quote;
}

export async function fetchProposalQuote(
  leadId: string,
  opts?: { preview?: boolean }
): Promise<{
  lead: {
    id: string;
    lead_no: string;
    name: string;
    assigned_to: { id: string; name: string } | null;
  };
  quote: LeadQuoteDto | null;
}> {
  const qs = opts?.preview ? "?preview=1" : "";
  const res = await fetch(`/api/proposal/${leadId}${qs}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load proposal");
  return (await res.json()) as {
    lead: {
      id: string;
      lead_no: string;
      name: string;
      assigned_to: { id: string; name: string } | null;
    };
    quote: LeadQuoteDto | null;
  };
}
