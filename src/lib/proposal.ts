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
  nights: number;
  days: number;
  overview: string;
  inclusions: string[];
  itinerary: ProposalDay[];
  startingFrom: number;
  templateId?: string;
  isCustomized?: boolean;
};

function templateToProposal(t: ItineraryTemplate): ProposalTemplate {
  return {
    title: t.name,
    subtitle: t.subtitle,
    nights: t.nights,
    days: t.days,
    overview: t.overview,
    inclusions: [...t.inclusions],
    itinerary: t.daysPlan.map((d) => ({ ...d })),
    startingFrom: t.startingFrom,
    templateId: t.id,
    isCustomized: false,
  };
}

function customToProposal(
  custom: LeadCustomItinerary,
  fallback?: ItineraryTemplate
): ProposalTemplate {
  const days = custom.daysPlan.length || fallback?.days || 1;
  return {
    title: custom.title,
    subtitle: custom.subtitle,
    nights: Math.max(days - 1, 0),
    days,
    overview: custom.overview,
    inclusions: [...custom.inclusions],
    itinerary: custom.daysPlan.map((d) => ({ ...d })),
    startingFrom: fallback?.startingFrom ?? 0,
    templateId: custom.templateId,
    isCustomized: true,
  };
}

const fallbackProposal: ProposalTemplate = {
  title: "Custom Himachal Taxi Tour",
  subtitle: "Tailored itinerary · private cab",
  nights: 2,
  days: 3,
  overview:
    "A flexible custom tour plan based on your preferred pickup, drop and sightseeing notes.",
  inclusions: ["Private cab", "Driver", "Fuel", "Toll & parking"],
  startingFrom: 8000,
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
    ? lead.customItinerary.daysPlan.length || template.days
    : lead.days || template.days;

  return {
    ...template,
    days: dayCount,
    nights: Math.max(dayCount - 1, 0),
    quoteAmount: amount ?? lead.budget ?? template.startingFrom,
    customer: lead.name,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    pickup: lead.pickup,
    dropoff: lead.dropoff,
    travelDate: lead.travelDate,
    returnDate: lead.returnDate,
    cabType: lead.cabType,
    adults: lead.adults,
    kids: lead.kids,
    tourPackage: lead.tourPackage,
    tourPlan: lead.tourPlan,
    agent: lead.agent,
    leadId: lead.id,
  };
}

export type LeadProposal = ReturnType<typeof buildProposalForLead>;
