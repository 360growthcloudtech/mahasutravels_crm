import { Lead } from "@/lib/data";

export type ProposalDay = {
  day: number;
  title: string;
  detail: string;
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
};

const shimlaManali: ProposalTemplate = {
  title: "Majestic Himachal Tour — Shimla & Manali",
  subtitle: "Queen of Hills to Valley of Gods",
  nights: 5,
  days: 6,
  overview:
    "A scenic Himalayan journey covering Shimla and Manali with private cab, hotel stays and curated sightseeing. Ideal for families and couples looking for a comfortable hill-station escape.",
  inclusions: ["Hotel stay", "Private cab", "Sightseeing", "Driver allowance", "Toll & parking"],
  startingFrom: 21500,
  itinerary: [
    { day: 1, title: "Arrival & transfer to Shimla", detail: "Pickup from airport/railway station. Drive to Shimla (~7–8 hrs). Check-in and evening at Mall Road." },
    { day: 2, title: "Shimla local sightseeing", detail: "Full-day tour of Kufri, Jakhoo Temple and Mall Road. Overnight stay in Shimla." },
    { day: 3, title: "Shimla to Manali via Kullu Valley", detail: "Scenic drive through Kullu Valley. Optional river rafting stop. Evening arrival and check-in at Manali." },
    { day: 4, title: "Manali local sightseeing", detail: "Hadimba Temple, Manu Temple, Vashisht hot springs and Tibetan Monastery. Free evening in Old Manali." },
    { day: 5, title: "Solang Valley / Rohtang excursion", detail: "Day trip to Solang Valley (or Rohtang Pass subject to permit/weather). Adventure activities optional." },
    { day: 6, title: "Departure", detail: "Checkout after breakfast and drop to Chandigarh / Delhi as per booking." },
  ],
};

const completeHimachal: ProposalTemplate = {
  title: "Complete Himachal Taxi Tour",
  subtitle: "Shimla · Manali · Dharamshala · Dalhousie",
  nights: 9,
  days: 10,
  overview:
    "An extended Himachal circuit covering the major hill stations with private tempo/cab support — built for groups who want one seamless road trip across the mountains.",
  inclusions: ["Private cab / tempo", "Driver & fuel", "Hotel stay support", "Sightseeing stops", "State taxes"],
  startingFrom: 42000,
  itinerary: [
    { day: 1, title: "Pickup & drive to Shimla", detail: "Morning pickup. Transfer to Shimla with en-route stops. Evening leisure." },
    { day: 2, title: "Shimla sightseeing", detail: "Kufri, Mall Road and Jakhoo. Overnight Shimla." },
    { day: 3, title: "Shimla to Manali", detail: "Drive via Kullu Valley. Check-in Manali." },
    { day: 4, title: "Manali local", detail: "Hadimba, Vashisht and Old Manali cafes." },
    { day: 5, title: "Solang / Rohtang day", detail: "Adventure valley day trip. Return overnight Manali." },
    { day: 6, title: "Manali to Dharamshala", detail: "Long scenic transfer to McLeod Ganj / Dharamshala." },
    { day: 7, title: "Dharamshala sightseeing", detail: "Dalai Lama Temple, Bhagsu waterfall and local markets." },
    { day: 8, title: "Dharamshala to Dalhousie", detail: "Transfer to Dalhousie. Evening stroll." },
    { day: 9, title: "Dalhousie & Khajjiar", detail: "Khajjiar lake day trip — mini Switzerland of India." },
    { day: 10, title: "Departure", detail: "Checkout and drop to Chandigarh / Pathankot / Delhi." },
  ],
};

const kinnaurSpiti: ProposalTemplate = {
  title: "Kinnaur Spiti Taxi Tour",
  subtitle: "High-altitude desert & Himalayan villages",
  nights: 9,
  days: 10,
  overview:
    "A rugged Spiti circuit with private cab for explorers who want monasteries, mountain passes and remote village stays.",
  inclusions: ["Private cab", "Experienced hill driver", "Permit support", "Flexible sightseeing"],
  startingFrom: 38000,
  itinerary: [
    { day: 1, title: "Delhi / Chandigarh to Shimla", detail: "Start of the Spiti approach via Shimla." },
    { day: 2, title: "Shimla to Sangla / Kalpa", detail: "Enter Kinnaur. Overnight in Kalpa or Sangla." },
    { day: 3, title: "Kalpa to Nako / Tabo", detail: "Cross into Spiti valley with monastery stops." },
    { day: 4, title: "Tabo to Kaza", detail: "Arrive Kaza — base for Spiti exploration." },
    { day: 5, title: "Kaza local & Key Monastery", detail: "Key Gompa, Kibber and Chicham bridge." },
    { day: 6, title: "Pin Valley / Dhankar", detail: "Optional Pin Valley or Dhankar monastery day." },
    { day: 7, title: "Kaza to Chandratal / Manali route", detail: "High-pass transfer weather permitting." },
    { day: 8, title: "Buffer / sightseeing day", detail: "Flexible day for weather or rest." },
    { day: 9, title: "Return toward Manali / Shimla", detail: "Begin descent toward the plains." },
    { day: 10, title: "Drop to Chandigarh / Delhi", detail: "Final transfer and trip close." },
  ],
};

const majesticChandigarh: ProposalTemplate = {
  title: "Majestic Himachal Tour from Lively Chandigarh",
  subtitle: "8 Nights / 9 Days · Shimla · Manali · Kasol",
  nights: 8,
  days: 9,
  overview:
    "Start from Chandigarh and explore Shimla — the Queen of Hills — then Manali, Valley of Gods, and Kasol in Parvati Valley. A dummy brochure-style proposal for private cab + hotel packages.",
  inclusions: ["Hotel", "Car / transportation", "Sightseeing", "Driver allowance", "Toll & parking"],
  startingFrom: 21500,
  itinerary: [
    { day: 1, title: "Arrival at Chandigarh, transfer to Shimla", detail: "Meet & greet at Chandigarh. Scenic drive to Shimla. Evening free at Mall Road." },
    { day: 2, title: "Shimla local sightseeing", detail: "Kufri, Mall Road and Jakhoo Temple. Overnight Shimla." },
    { day: 3, title: "Shimla to Manali via Kullu Valley", detail: "Drive through pine forests and Kullu Valley. Evening Manali check-in." },
    { day: 4, title: "Manali local sightseeing", detail: "Hadimba Temple, Vashisht hot springs and local markets." },
    { day: 5, title: "Solang Valley / Rohtang Pass excursion", detail: "Snow & adventure day (permit/weather dependent)." },
    { day: 6, title: "Manali to Kasol (Parvati Valley)", detail: "Transfer to Kasol. Evening cafes and riverside walk." },
    { day: 7, title: "Kasol sightseeing and trekking", detail: "Optional Manikaran visit or short trek nearby." },
    { day: 8, title: "Departure from Kasol to Chandigarh", detail: "Drive back toward Chandigarh with photo stops." },
    { day: 9, title: "Drop & tour ends", detail: "Final drop at Chandigarh airport/railway station." },
  ],
};

const defaultTemplate: ProposalTemplate = {
  title: "Custom Himachal Taxi Tour",
  subtitle: "Tailored itinerary · private cab",
  nights: 2,
  days: 3,
  overview:
    "A flexible custom tour plan based on your preferred pickup, drop and sightseeing notes. This is a dummy proposal you can refine with the guest.",
  inclusions: ["Private cab", "Driver", "Fuel", "Toll & parking"],
  startingFrom: 8000,
  itinerary: [
    { day: 1, title: "Pickup & start of tour", detail: "Cab report at pickup point. Drive as per agreed plan." },
    { day: 2, title: "Sightseeing day", detail: "Full day at disposal for local sightseeing and leisure." },
    { day: 3, title: "Return & drop", detail: "Checkout transfer and drop at agreed point." },
  ],
};

export function getProposalTemplate(tourPackage: string): ProposalTemplate {
  if (tourPackage.includes("Complete Himachal")) return completeHimachal;
  if (tourPackage.includes("Kinnaur") || tourPackage.includes("Spiti")) return kinnaurSpiti;
  if (tourPackage.includes("Shimla Manali")) return shimlaManali;
  if (tourPackage.includes("Custom") || tourPackage.includes("Cab rental")) {
    return {
      ...majesticChandigarh,
      title: majesticChandigarh.title,
      overview: majesticChandigarh.overview,
    };
  }
  return defaultTemplate;
}

export function buildProposalForLead(lead: Lead, amount?: number) {
  const template =
    lead.pickup.toLowerCase().includes("chandigarh") && lead.days >= 8
      ? majesticChandigarh
      : getProposalTemplate(lead.tourPackage);

  return {
    ...template,
    days: lead.days || template.days,
    nights: Math.max((lead.days || template.days) - 1, 0),
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
