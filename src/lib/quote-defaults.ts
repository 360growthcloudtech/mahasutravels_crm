import type { Lead } from "@/lib/data";
import { estimateCabPrice, matchItineraryTemplate, type ItineraryTemplate } from "@/lib/data";

export type QuoteDay = {
  day: number;
  date?: string;
  title: string;
  distance?: string;
  stay?: string;
  detail: string;
  highlights: string[];
  overnight?: string;
};

export type QuoteHotel = {
  location: string;
  hotel_name: string;
  category?: string;
  nights?: number | string;
  rooms?: number | string;
  rate?: string;
  notes?: string;
};

export type LeadQuoteStatus = "Draft" | "Sent";

export type LeadQuoteInput = {
  greeting: string;
  intro_text: string;
  company_contact_name: string;
  company_contact_phone: string;
  destination: string;
  duration_label: string;
  vehicle_label: string;
  amount: number;
  amount_note: string;
  inclusions: string[];
  exclusions: string[];
  terms: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  adults: number;
  kids: number;
  kids_note: string;
  travel_date: string | null;
  return_date: string | null;
  pickup: string;
  dropoff: string;
  tour_title: string;
  tour_subtitle: string;
  days: QuoteDay[];
  hotels: QuoteHotel[];
  note: string;
};

export type LeadQuoteDto = LeadQuoteInput & {
  id: string;
  lead_id: string;
  status: LeadQuoteStatus;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_QUOTE_GREETING = "Dear Sir / Ma'am,";

export const DEFAULT_QUOTE_INTRO =
  "Greetings from Mahasu Travels. Thank you for your enquiry. Please find below a complete tour package prepared for your travel dates. For any changes, reach our desk anytime.";

export const DEFAULT_COMPANY_CONTACT_NAME = "Mahasu Travels Desk";
export const DEFAULT_COMPANY_CONTACT_PHONE = "+91 98170 00000";

export const DEFAULT_EXCLUSIONS = [
  "Personal expenses & tips",
  "Entry fees / permits not mentioned",
  "Meals other than those listed",
  "Anything not listed under inclusions",
];

export const DEFAULT_TERMS =
  "40% advance to confirm the booking. Balance before trip start. Free cancellation up to 48 hours before travel (cab/hotel rules may apply). Rates subject to change for peak dates or last-minute amendments.";

/** Static PDF copy (not editable per quote). */
export const QUOTE_PDF_IMPORTANT_NOTES = [
  "The above package can be customized as per the customer's Requirement.",
  "Check In & Check out Time is 12:00 noon as per Hotel Policies (early check in is subject to availability).",
  "Meals Timings must be followed as per the instructed time of the hotels. For any un-availed meals we shall not be responsible.",
  "In few tourist destinations, the facilities of Hotel, Services, Aids etc. cannot be matched to developed destinations. Hotels in Himachal are categorised on the basis of location, Services and costing and not as per Star Categorisation i.e.; 1*, 2*, 3* and so on.",
  "We may have to reschedule the sightseeing days due to the closing of any monument during that particular day to ensure smooth execution of tours.",
  "Extra cost may be applied for any unexpected event.",
  "Final confirmation acceptance should be only on a written basis & No discount will be provided after the issuance of confirmation letter.",
] as const;

export const QUOTE_PDF_BOOKING_INTRO =
  "Please refer to the detailed processes listed under 'How to Book Online' and 'How to Book Offline'. Payment Schedule for Land Package Only. Customer have to pay package amount in Three instalments.";

export const QUOTE_PDF_PAYMENT_SCHEDULE = [
  {
    item: "First Instalment",
    percentage: "50 %",
    when: "In advance at the time of booking.",
  },
  {
    item: "Second Instalment",
    percentage: "25 %",
    when: "At the time of pick up on 1st Day.",
  },
  {
    item: "Third Instalment",
    percentage: "25 %",
    when: "1 Day Before the Tour Ends.",
  },
] as const;

export const QUOTE_PDF_PAYMENT_METHODS = {
  upiTitle: "Paytm / GooglePay / PhonePe",
  upiDetail: "Sanjeev Kumar — 9418800107",
  bankTitle: "CANARA BANK (Current A/C)",
  bankLines: [
    "Name: Wonderland Himachal",
    "Bank Name: Canara Bank",
    "A/C Type: Current Account",
    "A/C No: 125005441683",
    "IFSC Code: CNRB0018900",
    "Branch: Shimla H. P. 171001",
  ],
  scannerNote: "UPI scanner — share QR on confirmation / WhatsApp",
} as const;

export const QUOTE_PDF_CANCELLATION_POLICY = [
  "There is no contract between the company and the client until the company has received the initial deposit amount of the specified tour package. Payment must be received in accordance with the procedures of Payment Policy.",
  "In case, a customer wishes to cancel his/her booking before 15 days to the travel date because of whatsoever reasons including accident, illness, or any other personal reasons including non-payment of the balance payment, the Company is liable to recover Cancellation charges from the Client. All cancellations are to be communicated in writing.",
  "Advance amount 50% is also non-refundable in case the cancellation is done within 15 days to the travel dates or No Show scenarios.",
  "Advance token amount 25% is non-refundable in any case.",
  "In exceptional cases like Instant death company can refund the advance payment amount but after deducting its necessary service charges* (Company would also need the death certificate for the same for Refund).",
  "The Company has complete authority to change the package costing if in future there is a hike in tariff & taxes of hotels, transportation or any other additional services provided.",
  "Only those Services will be provided to the customers as mentioned in the booking voucher.",
  "Any complimentary services (If not provided) cannot be claimed in form cash/money/alternative services. * Service Charge & Service tax is different.",
] as const;

export const QUOTE_PDF_AMENDMENT_POLICY = [
  "In case a client wishes to prepone / postpone his or her travel dates, we request you to kindly reach us 7 days prior to the journey date via mail.",
  "The customers can postpone/prepone their tour once without any additional charges (if intimated before 7 days of travel date in written). However, postponing & preponing second time will attract additional charges.",
  "Also note that few service providers (Hoteliers, Transporter etc.) may apply postpone/prepone charges even after meeting the above requirement. In such cases postpone/prepone charges will be deducted from the advance amount deposited.",
  "In all prepone or postpone scenarios, the services and the costing will be subject to availability of Hotel/Volvo and season/off season time.",
  "We do not accept any change in plan within 7 days of travel date. However in rare cases like adverse climatic conditions or strikes, packages can be postponed which will be intimated to you beforehand.",
  "The validity to utilize your Advance payment in prepone/postpone scenarios is 1 Year from the date of advance payment.",
  "The advance payment and the invoice Number allotted to you, are transferable i.e. you can pass on your booking to any of your friends/ relatives. (Please Note: In order to transfer your booking you must meet the above terms and conditions first).",
  "Company has a right to reschedule the sightseeing days to ensure smooth execution of tours.",
  "Any amendment requested during the tour, will be treated as a fresh booking and additional cost will be charged other than earlier allocated tour cost.",
] as const;

export const QUOTE_PDF_CLOSING = {
  regards: "THANKS & REGARDS,",
  name: "Amit Thakur (Sr. Sales Executive)",
  mobiles: ["+91 8219031654", "9805378073"],
  emergency:
    "Emergency Contacts: Mr. Sanjeev Kumar (M. D.) 8894424550 / 9816248301 / 8894446040",
  email: "himachaltaxitripshimla@gmail.com",
  website: "www.himachaltaxitrip.com",
  address:
    "Lakhanpal Building, Near Tara Devi Railway Station, Shimla- 171010. H. P. India.",
  thankYou: 'THANK YOU FOR CONSULTING "HIMACHAL TAXI TRIP" FOR YOUR TRIP',
} as const;

function addDaysIso(iso: string, offset: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseHighlightsFromDetail(detail: string): { body: string; highlights: string[] } {
  const plain = stripHtml(detail);
  const lines = plain
    .split(/\n|•|·/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return { body: plain, highlights: [] };
  const body = lines[0];
  const highlights = lines.slice(1).filter((l) => l.length < 120);
  return { body, highlights };
}

export function normalizeQuoteHotels(raw: unknown): QuoteHotel[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return {
      location: typeof row.location === "string" ? row.location : "",
      hotel_name: typeof row.hotel_name === "string" ? row.hotel_name : "",
      category: typeof row.category === "string" ? row.category : "",
      nights:
        typeof row.nights === "number" || typeof row.nights === "string" ? row.nights : "",
      rooms: typeof row.rooms === "number" || typeof row.rooms === "string" ? row.rooms : "",
      rate: typeof row.rate === "string" ? row.rate : "",
      notes: typeof row.notes === "string" ? row.notes : "",
    };
  });
}

export function normalizeQuoteDays(raw: unknown): QuoteDay[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const highlights = Array.isArray(row.highlights)
      ? row.highlights.map((h) => String(h).trim()).filter(Boolean)
      : [];
    return {
      day: typeof row.day === "number" && row.day > 0 ? Math.floor(row.day) : index + 1,
      date: typeof row.date === "string" && row.date ? row.date.slice(0, 10) : undefined,
      title: typeof row.title === "string" ? row.title : `Day ${index + 1}`,
      distance: typeof row.distance === "string" ? row.distance : "",
      stay: typeof row.stay === "string" ? row.stay : "",
      detail: typeof row.detail === "string" ? row.detail : "",
      highlights,
      overnight: typeof row.overnight === "string" ? row.overnight : "",
    };
  });
}

export function daysFromItineraryTemplate(
  template: ItineraryTemplate,
  travelDate?: string | null
): QuoteDay[] {
  return template.daysPlan.map((d, index) => {
    const parsed = parseHighlightsFromDetail(d.detail);
    const date = travelDate ? addDaysIso(travelDate, index) || undefined : undefined;
    return {
      day: d.day || index + 1,
      date,
      title: d.title,
      distance: "",
      stay: d.hotelName || "",
      detail: parsed.body || stripHtml(d.detail),
      highlights: parsed.highlights,
      overnight: d.hotelName ? `Overnight stay in ${d.hotelName}.` : "",
    };
  });
}

export function buildQuoteDefaults(
  lead: Lead,
  templates: ItineraryTemplate[] = []
): LeadQuoteInput {
  const matched = matchItineraryTemplate(templates, {
    templateId: lead.itineraryTemplateId,
    tourPackage: lead.tourPackage,
  });
  const custom = lead.customItinerary;
  const dayCount =
    custom?.daysPlan.length ||
    lead.days ||
    (matched ? Number.parseInt(matched.days, 10) || matched.daysPlan.length : 0) ||
    1;
  const nights = Math.max(dayCount - 1, 0);

  let days: QuoteDay[] = [];
  if (custom?.daysPlan.length) {
    days = custom.daysPlan.map((d, index) => {
      const parsed = parseHighlightsFromDetail(d.detail);
      return {
        day: d.day || index + 1,
        date: lead.pickupDate ? addDaysIso(lead.pickupDate, index) || undefined : undefined,
        title: d.title,
        distance: "",
        stay: d.hotelName || "",
        detail: parsed.body || stripHtml(d.detail),
        highlights: parsed.highlights,
        overnight: d.hotelName ? `Overnight stay in ${d.hotelName}.` : "",
      };
    });
  } else if (matched) {
    days = daysFromItineraryTemplate(matched, lead.pickupDate || null);
  } else {
    days = [
      {
        day: 1,
        date: lead.pickupDate || undefined,
        title: lead.pickup && lead.drop ? `${lead.pickup} to ${lead.drop}` : "Tour day 1",
        distance: "",
        stay: "",
        detail: lead.notes || "Pickup and start of tour as per agreed plan.",
        highlights: [],
        overnight: "",
      },
    ];
  }

  const amount =
    estimateCabPrice(lead.car, dayCount) || lead.price || matched?.startingFrom || 0;

  return {
    greeting: DEFAULT_QUOTE_GREETING,
    intro_text: DEFAULT_QUOTE_INTRO,
    company_contact_name: DEFAULT_COMPANY_CONTACT_NAME,
    company_contact_phone: DEFAULT_COMPANY_CONTACT_PHONE,
    destination:
      matched?.tourPackage ||
      lead.tourPackage ||
      [lead.pickup, lead.drop].filter(Boolean).join(" – "),
    duration_label: `${nights} Nights / ${dayCount} Days`,
    vehicle_label: lead.car || "",
    amount,
    amount_note: "",
    inclusions: custom?.inclusions?.length
      ? [...custom.inclusions]
      : matched
        ? [...matched.inclusions]
        : ["Private cab", "Driver", "Fuel", "Toll & parking"],
    exclusions: [...DEFAULT_EXCLUSIONS],
    terms: DEFAULT_TERMS,
    guest_name: lead.name || "",
    guest_phone: lead.phone || "",
    guest_email: lead.email || "",
    adults: lead.adults || 0,
    kids: lead.kids || 0,
    kids_note: "",
    travel_date: lead.pickupDate || null,
    return_date: lead.dropDate || null,
    pickup: lead.pickup || "",
    dropoff: lead.drop || "",
    tour_title: custom?.title || matched?.name || lead.tourPackage || "Custom Tour Package",
    tour_subtitle: custom?.subtitle || matched?.subtitle || "Private cab package",
    days,
    hotels: [],
    note: lead.notes || "",
  };
}

/** Apply a master template onto an existing quote draft (overwrite title/days/inclusions). */
export function applyTemplateToQuote(
  current: LeadQuoteInput,
  template: ItineraryTemplate
): LeadQuoteInput {
  const dayCount = template.daysPlan.length || Number.parseInt(template.days, 10) || 1;
  const nights =
    Number.parseInt(template.nights, 10) || Math.max(dayCount - 1, 0);
  return {
    ...current,
    tour_title: template.name,
    tour_subtitle: template.subtitle,
    destination: template.tourPackage || current.destination,
    duration_label: `${nights} Nights / ${dayCount} Days`,
    inclusions: [...template.inclusions],
    days: daysFromItineraryTemplate(template, current.travel_date),
    amount: current.amount > 0 ? current.amount : template.startingFrom,
  };
}
