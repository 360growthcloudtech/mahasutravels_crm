import {
  Lead,
  ItineraryTemplate,
  LeadCustomItinerary,
  matchItineraryTemplate,
  itineraries as seedItineraries,
} from "@/lib/data";

export type ProposalDay = {
  day: number;
  title: string;
  detail: string;
  hotelId?: string;
  hotelName?: string;
};

export type ProposalTemplate = {
  title: string;
  subtitle: string;
  nights: string;
  days: string;
  overview: string;
  inclusions: string[];
  itinerary: ProposalDay[];
  startingFrom: number;
  discountPercentage: number;
  templateId?: string;
  isCustomized?: boolean;
};

function parseDurationNumber(value: string | number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function templateToProposal(t: ItineraryTemplate): ProposalTemplate {
  return {
    title: t.name,
    subtitle: t.subtitle,
    nights: t.nights || String(Math.max(t.daysPlan.length - 1, 0)),
    days: t.days || String(Math.max(t.daysPlan.length, 1)),
    overview: t.overview,
    inclusions: [...t.inclusions],
    itinerary: t.daysPlan.map((d) => ({ ...d })),
    startingFrom: t.startingFrom,
    discountPercentage: t.discountPercentage ?? 0,
    templateId: t.id,
    isCustomized: false,
  };
}

function customToProposal(
  custom: LeadCustomItinerary,
  fallback?: ItineraryTemplate
): ProposalTemplate {
  const dayCount = custom.daysPlan.length || parseDurationNumber(fallback?.days, 1);
  return {
    title: custom.title,
    subtitle: custom.subtitle,
    nights: String(Math.max(dayCount - 1, 0)),
    days: String(dayCount),
    overview: custom.overview,
    inclusions: [...custom.inclusions],
    itinerary: custom.daysPlan.map((d) => ({ ...d })),
    startingFrom: fallback?.startingFrom ?? 0,
    discountPercentage: fallback?.discountPercentage ?? 0,
    templateId: custom.templateId,
    isCustomized: true,
  };
}

const fallbackProposal: ProposalTemplate = {
  title: "Custom Himachal Taxi Tour",
  subtitle: "Tailored itinerary · private cab",
  nights: "2",
  days: "3",
  overview:
    "A flexible custom tour plan based on your preferred pickup, drop and sightseeing notes.",
  inclusions: ["Private cab", "Driver", "Fuel", "Toll & parking"],
  startingFrom: 8000,
  discountPercentage: 0,
  itinerary: [
    { day: 1, title: "Pickup & start of tour", detail: "Cab report at pickup point. Drive as per agreed plan." },
    { day: 2, title: "Sightseeing day", detail: "Full day at disposal for local sightseeing and leisure." },
    { day: 3, title: "Return & drop", detail: "Checkout transfer and drop at agreed point." },
  ],
};

export function resolveProposalTemplate(
  lead: Lead,
  templates: ItineraryTemplate[] = seedItineraries
): ProposalTemplate {
  if (lead.customItinerary) {
    const master = matchItineraryTemplate(templates, {
      templateId: lead.customItinerary.templateId || lead.itineraryTemplateId,
      tourPackage: lead.tourPackage,
    });
    return customToProposal(lead.customItinerary, master);
  }

  const matched = matchItineraryTemplate(templates, {
    templateId: lead.itineraryTemplateId,
    tourPackage: lead.tourPackage,
  });

  if (matched) return templateToProposal(matched);
  return fallbackProposal;
}

/** @deprecated Prefer resolveProposalTemplate with store itineraries */
export function getProposalTemplate(tourPackage: string): ProposalTemplate {
  const matched = matchItineraryTemplate(seedItineraries, { tourPackage });
  return matched ? templateToProposal(matched) : fallbackProposal;
}

export function buildProposalForLead(
  lead: Lead,
  amount?: number,
  templates: ItineraryTemplate[] = seedItineraries
) {
  const template = resolveProposalTemplate(lead, templates);
  const dayCount = lead.customItinerary
    ? lead.customItinerary.daysPlan.length || parseDurationNumber(template.days, 1)
    : lead.days || parseDurationNumber(template.days, 1);

  return {
    ...template,
    days: String(dayCount),
    nights: String(Math.max(dayCount - 1, 0)),
    quoteAmount: amount ?? lead.price ?? template.startingFrom,
    customer: lead.name,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    pickup: lead.pickup,
    dropoff: lead.drop,
    travelDate: lead.pickupDate,
    returnDate: lead.dropDate,
    cabType: lead.car,
    adults: lead.adults,
    kids: lead.kids,
    tourPackage: lead.tourPackage,
    tourPlan: lead.notes,
    agent: lead.assignedTo?.name ?? "",
    leadId: lead.leadNo || lead.id,
  };
}

export type LeadProposal = ReturnType<typeof buildProposalForLead>;
