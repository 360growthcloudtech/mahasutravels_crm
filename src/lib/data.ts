export function genId(prefix: string) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Quoted"
  | "Follow-up"
  | "Confirmed"
  | "Lost";

export type LeadComment = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

export type LeadHistoryAction =
  | "created"
  | "status_changed"
  | "updated"
  | "comment_added"
  | "assigned"
  | "quoted"
  | "whatsapp"
  | "note";

export type LeadHistoryEvent = {
  id: string;
  action: LeadHistoryAction;
  label: string;
  detail?: string;
  actor: string;
  createdAt: string;
};

export type ItineraryDay = {
  day: number;
  title: string;
  detail: string;
};

export type ItineraryStatus = "Active" | "Draft" | "Archived";

export type ItineraryTemplate = {
  id: string;
  name: string;
  tourPackage: string;
  subtitle: string;
  nights: number;
  days: number;
  overview: string;
  inclusions: string[];
  startingFrom: number;
  daysPlan: ItineraryDay[];
  status: ItineraryStatus;
  updatedAt: string;
};

/** Customer-specific clone — editing this never mutates the master template. */
export type LeadCustomItinerary = {
  templateId: string;
  title: string;
  subtitle: string;
  overview: string;
  inclusions: string[];
  daysPlan: ItineraryDay[];
};

export const trackedWebsites = [
  { id: "web-1", name: "mahasutravels.com", label: "Mahasu Main Portal", badge: "Main", icon: "🌐" },
  { id: "web-2", name: "himachaltaxiservice.in", label: "Himachal Taxi Service", badge: "Cab Rentals", icon: "🚗" },
  { id: "web-3", name: "spitivalleytours.com", label: "Spiti Valley Tours", badge: "Expeditions", icon: "🏔️" },
  { id: "web-4", name: "shimlamanalicabs.com", label: "Shimla Manali Cabs", badge: "Packages", icon: "🌲" },
  { id: "web-5", name: "lehladakhcabs.in", label: "Leh Ladakh Cabs", badge: "Luxury Fleet", icon: "❄️" },
] as const;

export type TrackedWebsiteName = typeof trackedWebsites[number]["name"];

export type Lead = {
  id: string;
  name: string;
  email: string;
  city: string;
  phone: string;
  source: "Website" | "Google Ads" | "Meta Ads" | "Manual";
  website?: string;
  tourPackage: string;
  pickup: string;
  dropoff: string;
  travelDate: string;
  returnDate: string;
  cabType: string;
  adults: number;
  kids: number;
  days: number;
  tourPlan: string;
  status: LeadStatus;
  agent: string;
  budget: number;
  lastActivity: string;
  duplicate?: boolean;
  comments?: LeadComment[];
  history?: LeadHistoryEvent[];
  itineraryTemplateId?: string;
  customItinerary?: LeadCustomItinerary;
};

export function renumberItineraryDays(days: ItineraryDay[]): ItineraryDay[] {
  return days.map((d, i) => ({ ...d, day: i + 1 }));
}

export function cloneItineraryFromTemplate(template: ItineraryTemplate): LeadCustomItinerary {
  return {
    templateId: template.id,
    title: template.name,
    subtitle: template.subtitle,
    overview: template.overview,
    inclusions: [...template.inclusions],
    daysPlan: template.daysPlan.map((d) => ({ ...d })),
  };
}

export function matchItineraryTemplate(
  templates: ItineraryTemplate[],
  opts: { templateId?: string; tourPackage?: string }
): ItineraryTemplate | undefined {
  const active = templates.filter((t) => t.status !== "Archived");
  if (opts.templateId) {
    const byId = active.find((t) => t.id === opts.templateId) ?? templates.find((t) => t.id === opts.templateId);
    if (byId) return byId;
  }
  if (opts.tourPackage) {
    const exact = active.find((t) => t.tourPackage === opts.tourPackage);
    if (exact) return exact;
    const pkg = opts.tourPackage;
    if (pkg.includes("Complete Himachal")) {
      return active.find((t) => t.tourPackage.includes("Complete Himachal"));
    }
    if (pkg.includes("Kinnaur") || pkg.includes("Spiti")) {
      return active.find((t) => t.tourPackage.includes("Kinnaur") || t.tourPackage.includes("Spiti"));
    }
    if (pkg.includes("Shimla Manali")) {
      return active.find((t) => t.tourPackage.includes("Shimla Manali"));
    }
    if (pkg.includes("Custom") || pkg.includes("Cab rental")) {
      return active.find((t) => t.id === "IT-1004") ?? active.find((t) => t.tourPackage.includes("Custom"));
    }
  }
  return active.find((t) => t.status === "Active");
}

export function makeLeadHistoryEvent(
  action: LeadHistoryAction,
  label: string,
  opts?: { detail?: string; actor?: string; createdAt?: string }
): LeadHistoryEvent {
  return {
    id: genId("EV"),
    action,
    label,
    detail: opts?.detail,
    actor: opts?.actor ?? "Priya",
    createdAt: opts?.createdAt ?? "Just now",
  };
}

/** Matches mahasutravels.com inquiry / price calculator options */
export const tourPackages = [
  "5N/6D Shimla Manali Taxi Tour",
  "9N/10D Kinnaur Spiti Taxi Tour",
  "5N/6D Amritsar Dharamshala Dalhousie Taxi Tour",
  "4N/5D Pathankot Dharamshala Dalhousie Taxi Tour",
  "9N/10D Complete Himachal Taxi Tour",
  "8N/9D Leh & Ladakh Taxi Tour",
  "Custom / Plan your trip",
  "Cab rental only",
] as const;

export const pickupLocations = [
  "Chandigarh",
  "Amritsar",
  "Pathankot",
  "Delhi",
  "Ambala",
  "Kalka",
] as const;

/** Fleet from /cabs + calculator cab list, with daily rates for estimate */
export const cabFleet: { name: string; seats: string; ratePerDay: number }[] = [
  { name: "Alto 800 (4+1)", seats: "4+1", ratePerDay: 2000 },
  { name: "Maruti Dezire (4+1)", seats: "4+1", ratePerDay: 2100 },
  { name: "Honda Amaze (4+1)", seats: "4+1", ratePerDay: 2100 },
  { name: "Toyota Etios (4+1)", seats: "4+1", ratePerDay: 2100 },
  { name: "Ertiga (6+1)", seats: "6+1", ratePerDay: 2800 },
  { name: "Toyota Innova (7+1)", seats: "7+1", ratePerDay: 3200 },
  { name: "Innova CRYSTA (7+1)", seats: "7+1", ratePerDay: 4000 },
  { name: "Mahindra Xylo (6+1)", seats: "6+1", ratePerDay: 3200 },
  { name: "Tavera (7+1)", seats: "7+1", ratePerDay: 3200 },
  { name: "Tempo Traveller (12+1)", seats: "12+1", ratePerDay: 4200 },
  { name: "Tempo Traveller (17+1)", seats: "17+1", ratePerDay: 5200 },
  { name: "Luxury Tempo Traveller (10+1)", seats: "10+1", ratePerDay: 5500 },
  { name: "Urbania Tempo Traveller (10+1)", seats: "10+1", ratePerDay: 6000 },
];

export function estimateCabPrice(cabType: string, days: number) {
  const cab = cabFleet.find((c) => c.name === cabType);
  if (!cab || days < 1) return 0;
  return cab.ratePerDay * days;
}

export function leadPax(lead: Pick<Lead, "adults" | "kids">) {
  return lead.adults + lead.kids;
}

const dummyHistory: Record<string, LeadHistoryEvent[]> = {
  "LD-2401": [
    { id: "EV-101", action: "created", label: "Lead created", detail: "Captured from Google Ads enquiry form", actor: "System", createdAt: "Today, 11:34 AM" },
    { id: "EV-102", action: "assigned", label: "Assigned to Aman", detail: "Round-robin assignment", actor: "System", createdAt: "Today, 11:34 AM" },
    { id: "EV-103", action: "whatsapp", label: "WhatsApp intro sent", detail: "Dummy · template: New enquiry reply", actor: "Aman", createdAt: "Today, 11:36 AM" },
    { id: "EV-104", action: "comment_added", label: "Comment added", detail: "Called once — asked for Innova Crysta quote with hotel options.", actor: "Aman", createdAt: "Today, 11:40 AM" },
  ],
  "LD-2400": [
    { id: "EV-201", action: "created", label: "Lead created", detail: "Captured from Meta Ads", actor: "System", createdAt: "Yesterday, 6:12 PM" },
    { id: "EV-202", action: "assigned", label: "Assigned to Priya", actor: "System", createdAt: "Yesterday, 6:12 PM" },
    { id: "EV-203", action: "status_changed", label: "Status changed to Contacted", detail: "New → Contacted", actor: "Priya", createdAt: "Yesterday, 6:40 PM" },
    { id: "EV-204", action: "whatsapp", label: "WhatsApp follow-up sent", detail: "Dummy · waiting on final pax count", actor: "Priya", createdAt: "Today, 10:55 AM" },
    { id: "EV-205", action: "comment_added", label: "Comment added", detail: "Group is 10 adults + 2 kids confirmed.", actor: "Priya", createdAt: "Today, 11:18 AM" },
  ],
  "LD-2399": [
    { id: "EV-301", action: "created", label: "Lead created", detail: "Website booking calculator", actor: "System", createdAt: "2 days ago, 3:05 PM" },
    { id: "EV-302", action: "assigned", label: "Assigned to Aman", actor: "System", createdAt: "2 days ago, 3:05 PM" },
    { id: "EV-303", action: "status_changed", label: "Status changed to Contacted", detail: "New → Contacted", actor: "Aman", createdAt: "2 days ago, 4:10 PM" },
    { id: "EV-304", action: "quoted", label: "Quote QT-3310 prepared", detail: "Dummy · ₹4,200 for 2 days Dezire", actor: "Aman", createdAt: "Yesterday, 11:20 AM" },
    { id: "EV-305", action: "status_changed", label: "Status changed to Quoted", detail: "Contacted → Quoted", actor: "Aman", createdAt: "Yesterday, 11:22 AM" },
  ],
  "LD-2398": [
    { id: "EV-401", action: "created", label: "Lead created", detail: "Manual entry by Sana", actor: "Sana", createdAt: "3 days ago, 10:00 AM" },
    { id: "EV-402", action: "status_changed", label: "Status changed to Follow-up", detail: "New → Follow-up", actor: "Sana", createdAt: "Yesterday, 4:15 PM" },
    { id: "EV-403", action: "note", label: "Follow-up reminder set", detail: "Dummy · due tomorrow morning", actor: "Sana", createdAt: "Yesterday, 4:20 PM" },
  ],
  "LD-2397": [
    { id: "EV-501", action: "created", label: "Lead created", detail: "Google Ads", actor: "System", createdAt: "5 days ago" },
    { id: "EV-502", action: "assigned", label: "Assigned to Priya", actor: "System", createdAt: "5 days ago" },
    { id: "EV-503", action: "status_changed", label: "Status changed to Quoted", detail: "Contacted → Quoted", actor: "Priya", createdAt: "4 days ago" },
    { id: "EV-504", action: "status_changed", label: "Status changed to Confirmed", detail: "Quoted → Confirmed · advance pending", actor: "Priya", createdAt: "3 hours ago" },
  ],
  "LD-2396": [
    { id: "EV-601", action: "created", label: "Lead created", detail: "Meta Ads", actor: "System", createdAt: "1 week ago" },
    { id: "EV-602", action: "quoted", label: "Quote sent", detail: "Dummy · Tempo Traveller package", actor: "Sana", createdAt: "6 days ago" },
    { id: "EV-603", action: "status_changed", label: "Status changed to Lost", detail: "Quoted → Lost · chose another vendor", actor: "Sana", createdAt: "5 hours ago" },
  ],
  "LD-2395": [
    { id: "EV-701", action: "created", label: "Lead created", detail: "Website · possible duplicate flagged", actor: "System", createdAt: "6 hours ago" },
    { id: "EV-702", action: "assigned", label: "Assigned to Aman", actor: "System", createdAt: "6 hours ago" },
    { id: "EV-703", action: "note", label: "Duplicate check queued", detail: "Dummy · matches Divya Negi phone pattern", actor: "System", createdAt: "6 hours ago" },
  ],
  "LD-2394": [
    { id: "EV-801", action: "created", label: "Lead created", detail: "Google Ads", actor: "System", createdAt: "8 hours ago" },
    { id: "EV-802", action: "assigned", label: "Assigned to Priya", actor: "System", createdAt: "8 hours ago" },
    { id: "EV-803", action: "status_changed", label: "Status changed to Quoted", detail: "New → Quoted", actor: "Priya", createdAt: "7 hours ago" },
    { id: "EV-804", action: "quoted", label: "Quote shared on WhatsApp", detail: "Dummy · ₹16,000 · 5N package", actor: "Priya", createdAt: "7 hours ago" },
  ],
};

const leadSeed: Omit<Lead, "history">[] = [
  { id: "LD-2401", name: "Ritika Sharma", email: "ritika.sharma@gmail.com", city: "Delhi", phone: "+91 98170 22314", source: "Google Ads", tourPackage: "5N/6D Shimla Manali Taxi Tour", pickup: "Delhi", dropoff: "Delhi", travelDate: "2026-08-12", returnDate: "2026-08-17", cabType: "Innova CRYSTA (7+1)", adults: 4, kids: 2, days: 6, tourPlan: "Family trip covering Shimla mall road and Manali local sightseeing.", status: "New", agent: "Aman", budget: 24000, lastActivity: "6m ago", itineraryTemplateId: "IT-1001", comments: [{ id: "CM-1", text: "Called once — asked for Innova Crysta quote with hotel options.", author: "Aman", createdAt: "Today, 11:40 AM" }] },
  { id: "LD-2400", name: "Karan Bhandari", email: "karan.b@outlook.com", city: "Chandigarh", phone: "+91 90158 77021", source: "Meta Ads", tourPackage: "9N/10D Complete Himachal Taxi Tour", pickup: "Chandigarh", dropoff: "Chandigarh", travelDate: "2026-08-15", returnDate: "2026-08-24", cabType: "Tempo Traveller (12+1)", adults: 10, kids: 2, days: 10, tourPlan: "Group tour — Shimla, Manali, Dharamshala, Dalhousie.", status: "Contacted", agent: "Priya", budget: 42000, lastActivity: "22m ago", itineraryTemplateId: "IT-1002", comments: [{ id: "CM-2", text: "WhatsApp intro sent. Waiting on final pax count.", author: "Priya", createdAt: "Today, 10:55 AM" }, { id: "CM-3", text: "Group is 10 adults + 2 kids confirmed.", author: "Priya", createdAt: "Today, 11:18 AM" }] },
  { id: "LD-2399", name: "Neha Kapoor", email: "neha.kapoor@yahoo.com", city: "Noida", phone: "+91 99889 10234", source: "Website", tourPackage: "Cab rental only", pickup: "Delhi", dropoff: "Delhi", travelDate: "2026-08-09", returnDate: "2026-08-10", cabType: "Maruti Dezire (4+1)", adults: 3, kids: 1, days: 2, tourPlan: "Weekend cab for Mussoorie day trip.", status: "Quoted", agent: "Aman", budget: 4200, lastActivity: "1h ago" },
  { id: "LD-2398", name: "Vivek Thakur", email: "vivek.thakur@gmail.com", city: "Shimla", phone: "+91 88170 44521", source: "Manual", tourPackage: "9N/10D Kinnaur Spiti Taxi Tour", pickup: "Delhi", dropoff: "Delhi", travelDate: "2026-08-10", returnDate: "2026-08-11", cabType: "Ertiga (6+1)", adults: 3, kids: 0, days: 2, tourPlan: "Short enquiry for Spiti dates — want Ertiga quote.", status: "Follow-up", agent: "Sana", budget: 5600, lastActivity: "2h ago", comments: [{ id: "CM-4", text: "Follow-up due tomorrow morning if no reply.", author: "Sana", createdAt: "Yesterday, 4:20 PM" }] },
  { id: "LD-2397", name: "Ananya Rao", email: "ananya.rao@gmail.com", city: "Chandigarh", phone: "+91 98765 22109", source: "Google Ads", tourPackage: "5N/6D Shimla Manali Taxi Tour", pickup: "Chandigarh", dropoff: "Chandigarh", travelDate: "2026-08-18", returnDate: "2026-08-23", cabType: "Innova CRYSTA (7+1)", adults: 5, kids: 2, days: 6, tourPlan: "Honeymoon + parents travelling together.", status: "Confirmed", agent: "Priya", budget: 24000, lastActivity: "3h ago" },
  { id: "LD-2396", name: "Rohan Malhotra", email: "rohan.m@gmail.com", city: "Gurugram", phone: "+91 97190 33452", source: "Meta Ads", tourPackage: "8N/9D Leh & Ladakh Taxi Tour", pickup: "Delhi", dropoff: "Delhi", travelDate: "2026-08-22", returnDate: "2026-08-30", cabType: "Tempo Traveller (17+1)", adults: 12, kids: 2, days: 9, tourPlan: "Corporate team outing to Ladakh.", status: "Lost", agent: "Sana", budget: 46800, lastActivity: "5h ago" },
  { id: "LD-2395", name: "Divya Negi", email: "divya.negi@gmail.com", city: "Solan", phone: "+91 96543 88012", source: "Website", tourPackage: "Custom / Plan your trip", pickup: "Kalka", dropoff: "Kalka", travelDate: "2026-08-11", returnDate: "2026-08-12", cabType: "Maruti Dezire (4+1)", adults: 2, kids: 1, days: 2, tourPlan: "Apple orchard visit near Narkanda.", status: "New", agent: "Aman", budget: 4200, lastActivity: "6h ago", duplicate: true },
  { id: "LD-2394", name: "Sameer Chauhan", email: "sameer.c@gmail.com", city: "Pathankot", phone: "+91 90200 11987", source: "Google Ads", tourPackage: "4N/5D Pathankot Dharamshala Dalhousie Taxi Tour", pickup: "Pathankot", dropoff: "Pathankot", travelDate: "2026-08-25", returnDate: "2026-08-29", cabType: "Toyota Innova (7+1)", adults: 5, kids: 1, days: 5, tourPlan: "Family trip with McLeod Ganj and Khajjiar.", status: "Quoted", agent: "Priya", budget: 16000, lastActivity: "8h ago" },
];

const defaultWebsites = [
  "mahasutravels.com",
  "himachaltaxiservice.in",
  "spitivalleytours.com",
  "shimlamanalicabs.com",
  "lehladakhcabs.in",
];

export const leads: Lead[] = leadSeed.map((l, index) => ({
  ...l,
  website: l.website || defaultWebsites[index % defaultWebsites.length],
  history: dummyHistory[l.id] ?? [
    {
      id: `EV-${l.id}`,
      action: "created",
      label: "Lead created",
      detail: `Source: ${l.source}`,
      actor: "System",
      createdAt: l.lastActivity,
    },
  ],
}));

export const itineraries: ItineraryTemplate[] = [
  {
    id: "IT-1001",
    name: "Majestic Himachal Tour — Shimla & Manali",
    tourPackage: "5N/6D Shimla Manali Taxi Tour",
    subtitle: "Queen of Hills to Valley of Gods",
    nights: 5,
    days: 6,
    overview:
      "A scenic Himalayan journey covering Shimla and Manali with private cab, hotel stays and curated sightseeing. Ideal for families and couples looking for a comfortable hill-station escape.",
    inclusions: ["Hotel stay", "Private cab", "Sightseeing", "Driver allowance", "Toll & parking"],
    startingFrom: 21500,
    status: "Active",
    updatedAt: "Today",
    daysPlan: [
      { day: 1, title: "Arrival & transfer to Shimla", detail: "Pickup from airport/railway station. Drive to Shimla (~7–8 hrs). Check-in and evening at Mall Road." },
      { day: 2, title: "Shimla local sightseeing", detail: "Full-day tour of Kufri, Jakhoo Temple and Mall Road. Overnight stay in Shimla." },
      { day: 3, title: "Shimla to Manali via Kullu Valley", detail: "Scenic drive through Kullu Valley. Optional river rafting stop. Evening arrival and check-in at Manali." },
      { day: 4, title: "Manali local sightseeing", detail: "Hadimba Temple, Manu Temple, Vashisht hot springs and Tibetan Monastery. Free evening in Old Manali." },
      { day: 5, title: "Solang Valley / Rohtang excursion", detail: "Day trip to Solang Valley (or Rohtang Pass subject to permit/weather). Adventure activities optional." },
      { day: 6, title: "Departure", detail: "Checkout after breakfast and drop to Chandigarh / Delhi as per booking." },
    ],
  },
  {
    id: "IT-1002",
    name: "Complete Himachal Taxi Tour",
    tourPackage: "9N/10D Complete Himachal Taxi Tour",
    subtitle: "Shimla · Manali · Dharamshala · Dalhousie",
    nights: 9,
    days: 10,
    overview:
      "An extended Himachal circuit covering the major hill stations with private tempo/cab support — built for groups who want one seamless road trip across the mountains.",
    inclusions: ["Private cab / tempo", "Driver & fuel", "Hotel stay support", "Sightseeing stops", "State taxes"],
    startingFrom: 42000,
    status: "Active",
    updatedAt: "Yesterday",
    daysPlan: [
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
  },
  {
    id: "IT-1003",
    name: "Kinnaur Spiti Taxi Tour",
    tourPackage: "9N/10D Kinnaur Spiti Taxi Tour",
    subtitle: "High-altitude desert & Himalayan villages",
    nights: 9,
    days: 10,
    overview:
      "A rugged Spiti circuit with private cab for explorers who want monasteries, mountain passes and remote village stays.",
    inclusions: ["Private cab", "Experienced hill driver", "Permit support", "Flexible sightseeing"],
    startingFrom: 38000,
    status: "Active",
    updatedAt: "2 days ago",
    daysPlan: [
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
  },
  {
    id: "IT-1004",
    name: "Majestic Himachal Tour from Chandigarh",
    tourPackage: "Custom / Plan your trip",
    subtitle: "8 Nights / 9 Days · Shimla · Manali · Kasol",
    nights: 8,
    days: 9,
    overview:
      "Start from Chandigarh and explore Shimla — the Queen of Hills — then Manali, Valley of Gods, and Kasol in Parvati Valley. Built for private cab + hotel packages.",
    inclusions: ["Hotel", "Car / transportation", "Sightseeing", "Driver allowance", "Toll & parking"],
    startingFrom: 21500,
    status: "Active",
    updatedAt: "3 days ago",
    daysPlan: [
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
  },
  {
    id: "IT-1005",
    name: "Custom Himachal Taxi Tour",
    tourPackage: "Cab rental only",
    subtitle: "Tailored itinerary · private cab",
    nights: 2,
    days: 3,
    overview:
      "A flexible custom tour plan based on preferred pickup, drop and sightseeing notes. Refine with the guest before sending the proposal.",
    inclusions: ["Private cab", "Driver", "Fuel", "Toll & parking"],
    startingFrom: 8000,
    status: "Draft",
    updatedAt: "1 week ago",
    daysPlan: [
      { day: 1, title: "Pickup & start of tour", detail: "Cab report at pickup point. Drive as per agreed plan." },
      { day: 2, title: "Sightseeing day", detail: "Full day at disposal for local sightseeing and leisure." },
      { day: 3, title: "Return & drop", detail: "Checkout transfer and drop at agreed point." },
    ],
  },
];

export type BookingStatus =
  | "Advance Pending"
  | "Advance Received"
  | "Balance Pending"
  | "Fully Paid"
  | "Cancelled"
  | "Refunded";

export type Hotel = {
  hotelTemplateId?: string;
  hotelName: string;
  address: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  roomCount: number;
  amount: number;
  referenceNumber: string;
  contactNumber?: string;
  notes?: string;
};

export type HotelTemplateStatus = "Active" | "Draft" | "Archived";

/** Reusable hotel master — booking stays clone details; masters stay unchanged. */
export type HotelTemplate = {
  id: string;
  name: string;
  city: string;
  address: string;
  contactNumber: string;
  defaultRoomType: string;
  typicalRate: number;
  notes: string;
  status: HotelTemplateStatus;
  updatedAt: string;
};

export type Booking = {
  id: string;
  customer: string;
  email: string;
  city: string;
  phone?: string;
  source: Lead["source"];
  website?: string;
  tourPackage: string;
  pickup: string;
  dropoff: string;
  travelDate: string;
  returnDate: string;
  cabType: string;
  adults: number;
  kids: number;
  days: number;
  tourPlan: string;
  agent: string;
  driver: string;
  vehicle: string;
  total: number;
  advance: number;
  balance: number;
  status: BookingStatus;
  hotel?: Hotel;
  comments?: LeadComment[];
  history?: LeadHistoryEvent[];
};

export function cloneStayFromHotelTemplate(
  template: HotelTemplate,
  booking?: Pick<Booking, "travelDate" | "returnDate"> | null
): Hotel {
  return {
    hotelTemplateId: template.id,
    hotelName: template.name,
    address: template.address,
    checkIn: booking?.travelDate || "",
    checkOut: booking?.returnDate || "",
    roomType: template.defaultRoomType,
    roomCount: 1,
    amount: template.typicalRate,
    referenceNumber: "",
    contactNumber: template.contactNumber,
    notes: "",
  };
}

export function bookingRoute(b: Pick<Booking, "pickup" | "dropoff" | "tourPackage">) {
  if (b.pickup && b.dropoff) return `${b.pickup} → ${b.dropoff}`;
  if (b.tourPackage) return b.tourPackage;
  return "—";
}

export const hotelTemplates: HotelTemplate[] = [
  {
    id: "HT-1001",
    name: "Hotel Willow Banks",
    city: "Shimla",
    address: "The Mall, Shimla, HP",
    contactNumber: "+91 94185 22011",
    defaultRoomType: "Deluxe Mountain View",
    typicalRate: 3600,
    notes: "Preferred Shimla property · ask for Mall-facing rooms",
    status: "Active",
    updatedAt: "Today",
  },
  {
    id: "HT-1002",
    name: "Snow Valley Resorts",
    city: "Manali",
    address: "Log Huts Rd, Manali, HP",
    contactNumber: "+91 98160 44521",
    defaultRoomType: "Family Suite",
    typicalRate: 7000,
    notes: "Good for groups · MAP available",
    status: "Active",
    updatedAt: "Yesterday",
  },
  {
    id: "HT-1003",
    name: "Hotel Mount View",
    city: "Dharamshala",
    address: "McLeod Ganj Road, Dharamshala, HP",
    contactNumber: "+91 1892 221098",
    defaultRoomType: "Standard Twin",
    typicalRate: 2800,
    notes: "Near Dalai Lama temple · walkable market",
    status: "Active",
    updatedAt: "3 days ago",
  },
  {
    id: "HT-1004",
    name: "Khajjiar Lake Resort",
    city: "Dalhousie",
    address: "Khajjiar Meadows, Dist. Chamba, HP",
    contactNumber: "+91 98170 88012",
    defaultRoomType: "Cottage",
    typicalRate: 4500,
    notes: "Seasonal rates · confirm meadow view",
    status: "Draft",
    updatedAt: "1 week ago",
  },
];

const bookingDummyHistory: Record<string, LeadHistoryEvent[]> = {
  "BK-1182": [
    { id: "BEV-101", action: "created", label: "Booking created", detail: "Converted from confirmed lead LD-2397", actor: "Priya", createdAt: "3 days ago" },
    { id: "BEV-102", action: "assigned", label: "Driver assigned", detail: "Suresh Thakur · HP-01-4521", actor: "Priya", createdAt: "3 days ago" },
    { id: "BEV-103", action: "note", label: "Hotel assigned", detail: "Hotel Willow Banks · 2 rooms", actor: "Priya", createdAt: "2 days ago" },
    { id: "BEV-104", action: "status_changed", label: "Status changed to Advance Received", detail: "Advance Pending → Advance Received · ₹5,000", actor: "Priya", createdAt: "Yesterday" },
  ],
  "BK-1181": [
    { id: "BEV-201", action: "created", label: "Booking created", detail: "Dummy · Delhi → Shimla round trip", actor: "Aman", createdAt: "1 week ago" },
    { id: "BEV-202", action: "status_changed", label: "Status changed to Fully Paid", detail: "Full payment ₹15,200 received", actor: "Aman", createdAt: "5 days ago" },
  ],
  "BK-1180": [
    { id: "BEV-301", action: "created", label: "Booking created", detail: "Shimla → Kasauli day trip", actor: "Sana", createdAt: "4 days ago" },
    { id: "BEV-302", action: "status_changed", label: "Status changed to Balance Pending", detail: "No advance collected yet", actor: "Sana", createdAt: "4 days ago" },
    { id: "BEV-303", action: "comment_added", label: "Comment added", detail: "Customer will pay on pickup.", actor: "Sana", createdAt: "Yesterday" },
  ],
  "BK-1179": [
    { id: "BEV-401", action: "created", label: "Booking created", detail: "Delhi → Manali · Tempo Traveller", actor: "Priya", createdAt: "1 week ago" },
    { id: "BEV-402", action: "note", label: "Hotel assigned", detail: "Snow Valley Resorts · 3 family suites", actor: "Priya", createdAt: "6 days ago" },
    { id: "BEV-403", action: "status_changed", label: "Status changed to Advance Received", detail: "₹10,000 advance · Dummy", actor: "Priya", createdAt: "5 days ago" },
  ],
  "BK-1178": [
    { id: "BEV-501", action: "created", label: "Booking created", actor: "Aman", createdAt: "2 weeks ago" },
    { id: "BEV-502", action: "status_changed", label: "Status changed to Cancelled", detail: "Customer postponed trip · Dummy", actor: "Aman", createdAt: "10 days ago" },
  ],
  "BK-1177": [
    { id: "BEV-601", action: "created", label: "Booking created", detail: "Delhi → Mussoorie", actor: "Sana", createdAt: "2 weeks ago" },
    { id: "BEV-602", action: "status_changed", label: "Status changed to Fully Paid", detail: "₹8,200 settled", actor: "Sana", createdAt: "12 days ago" },
  ],
};

const bookingSeed: Omit<Booking, "history">[] = [
  {
    id: "BK-1182",
    customer: "Ananya Rao",
    email: "ananya.rao@gmail.com",
    city: "Chandigarh",
    phone: "+91 98765 22109",
    source: "Google Ads",
    tourPackage: "5N/6D Shimla Manali Taxi Tour",
    pickup: "Chandigarh",
    dropoff: "Chandigarh",
    travelDate: "2026-08-18",
    returnDate: "2026-08-23",
    cabType: "Innova CRYSTA (7+1)",
    adults: 5,
    kids: 2,
    days: 6,
    tourPlan: "Honeymoon + parents travelling together.",
    agent: "Priya",
    driver: "Suresh Thakur",
    vehicle: "HP-01-4521",
    total: 11000,
    advance: 5000,
    balance: 6000,
    status: "Advance Received",
    hotel: {
      hotelTemplateId: "HT-1001",
      hotelName: "Hotel Willow Banks",
      address: "The Mall, Shimla, HP",
      checkIn: "2026-08-18",
      checkOut: "2026-08-20",
      roomType: "Deluxe Mountain View",
      roomCount: 2,
      amount: 7200,
      referenceNumber: "WB-RES-4471",
      contactNumber: "+91 94185 22011",
      notes: "Confirmed on phone · MAP breakfast · early check-in if ready",
    },
    comments: [
      {
        id: "BCM-1",
        text: "Hotel confirmation shared with customer on WhatsApp.",
        author: "Priya",
        createdAt: "Yesterday, 2:10 PM",
      },
    ],
  },
  {
    id: "BK-1181",
    customer: "Manish Verma",
    email: "manish.verma@gmail.com",
    city: "Delhi",
    phone: "+91 91125 66098",
    source: "Website",
    tourPackage: "Custom / Plan your trip",
    pickup: "Delhi",
    dropoff: "Delhi",
    travelDate: "2026-08-05",
    returnDate: "2026-08-08",
    cabType: "Ertiga (6+1)",
    adults: 4,
    kids: 1,
    days: 4,
    tourPlan: "Family sightseeing in Shimla.",
    agent: "Aman",
    driver: "Vinod Kumar",
    vehicle: "HR-26-9981",
    total: 15200,
    advance: 15200,
    balance: 0,
    status: "Fully Paid",
  },
  {
    id: "BK-1180",
    customer: "Pooja Rawat",
    email: "pooja.rawat@gmail.com",
    city: "Shimla",
    phone: "+91 99015 43201",
    source: "Manual",
    tourPackage: "Cab rental only",
    pickup: "Shimla",
    dropoff: "Kasauli",
    travelDate: "2026-08-03",
    returnDate: "2026-08-03",
    cabType: "Maruti Dezire (4+1)",
    adults: 2,
    kids: 0,
    days: 1,
    tourPlan: "Day trip to Kasauli.",
    agent: "Sana",
    driver: "Rakesh Negi",
    vehicle: "HP-08-2210",
    total: 4800,
    advance: 0,
    balance: 4800,
    status: "Balance Pending",
    comments: [
      { id: "BCM-2", text: "Customer will pay on pickup.", author: "Sana", createdAt: "Yesterday" },
    ],
  },
  {
    id: "BK-1179",
    customer: "Arjun Sethi",
    email: "arjun.sethi@gmail.com",
    city: "Delhi",
    phone: "+91 98221 30044",
    source: "Meta Ads",
    tourPackage: "Custom / Plan your trip",
    pickup: "Delhi",
    dropoff: "Manali",
    travelDate: "2026-08-01",
    returnDate: "2026-08-05",
    cabType: "Tempo Traveller (12+1)",
    adults: 10,
    kids: 2,
    days: 5,
    tourPlan: "Group tour with hotel stay in Manali.",
    agent: "Priya",
    driver: "Deepak Chand",
    vehicle: "HP-64-1187",
    total: 34000,
    advance: 10000,
    balance: 24000,
    status: "Advance Received",
    hotel: {
      hotelTemplateId: "HT-1002",
      hotelName: "Snow Valley Resorts",
      address: "Log Huts Rd, Manali, HP",
      checkIn: "2026-08-01",
      checkOut: "2026-08-05",
      roomType: "Family Suite",
      roomCount: 3,
      amount: 21000,
      referenceNumber: "SVR-8890",
      notes: "3 family suites blocked · dinner MAP",
    },
  },
  {
    id: "BK-1178",
    customer: "Kabir Anand",
    email: "kabir.anand@gmail.com",
    city: "Chandigarh",
    phone: "+91 90563 77021",
    source: "Google Ads",
    tourPackage: "5N/6D Shimla Manali Taxi Tour",
    pickup: "Chandigarh",
    dropoff: "Chandigarh",
    travelDate: "2026-07-29",
    returnDate: "2026-08-03",
    cabType: "Innova CRYSTA (7+1)",
    adults: 6,
    kids: 0,
    days: 6,
    tourPlan: "Cancelled after advance — postponed.",
    agent: "Aman",
    driver: "Suresh Thakur",
    vehicle: "HP-01-4521",
    total: 13500,
    advance: 13500,
    balance: 0,
    status: "Cancelled",
  },
  {
    id: "BK-1177",
    customer: "Ishita Bose",
    email: "ishita.bose@gmail.com",
    city: "Delhi",
    phone: "+91 88991 20567",
    source: "Website",
    tourPackage: "Cab rental only",
    pickup: "Delhi",
    dropoff: "Delhi",
    travelDate: "2026-07-27",
    returnDate: "2026-07-28",
    cabType: "Maruti Dezire (4+1)",
    adults: 3,
    kids: 1,
    days: 2,
    tourPlan: "Weekend Mussoorie cab.",
    agent: "Sana",
    driver: "Rakesh Negi",
    vehicle: "HP-08-2210",
    total: 8200,
    advance: 8200,
    balance: 0,
    status: "Fully Paid",
  },
  // Ongoing trips (travel ≤ today ≤ return) — enough for dashboard list
  {
    id: "BK-1190",
    customer: "Meera Joshi",
    email: "meera.joshi@gmail.com",
    city: "Delhi",
    phone: "+91 98111 22001",
    source: "Google Ads",
    tourPackage: "5N/6D Shimla Manali Taxi Tour",
    pickup: "Delhi",
    dropoff: "Delhi",
    travelDate: "2026-07-30",
    returnDate: "2026-08-04",
    cabType: "Innova CRYSTA (7+1)",
    adults: 4,
    kids: 1,
    days: 6,
    tourPlan: "Family Shimla–Manali circuit.",
    agent: "Priya",
    driver: "Suresh Thakur",
    vehicle: "HP-01-4521",
    total: 28000,
    advance: 10000,
    balance: 18000,
    status: "Advance Received",
  },
  {
    id: "BK-1191",
    customer: "Rahul Khanna",
    email: "rahul.khanna@gmail.com",
    city: "Gurugram",
    phone: "+91 98111 22002",
    source: "Website",
    tourPackage: "Custom / Plan your trip",
    pickup: "Gurugram",
    dropoff: "Shimla",
    travelDate: "2026-08-01",
    returnDate: "2026-08-06",
    cabType: "Ertiga (6+1)",
    adults: 5,
    kids: 0,
    days: 6,
    tourPlan: "Office team retreat.",
    agent: "Aman",
    driver: "Vinod Kumar",
    vehicle: "HR-26-9981",
    total: 22000,
    advance: 8000,
    balance: 14000,
    status: "Balance Pending",
  },
  {
    id: "BK-1192",
    customer: "Simran Gill",
    email: "simran.gill@gmail.com",
    city: "Chandigarh",
    phone: "+91 98111 22003",
    source: "Meta Ads",
    tourPackage: "4N/5D Pathankot Dharamshala Dalhousie Taxi Tour",
    pickup: "Chandigarh",
    dropoff: "Chandigarh",
    travelDate: "2026-07-31",
    returnDate: "2026-08-05",
    cabType: "Toyota Innova (7+1)",
    adults: 6,
    kids: 2,
    days: 5,
    tourPlan: "Dalhousie + Khajjiar.",
    agent: "Sana",
    driver: "Deepak Chand",
    vehicle: "HP-64-1187",
    total: 19500,
    advance: 19500,
    balance: 0,
    status: "Fully Paid",
  },
  {
    id: "BK-1193",
    customer: "Nikhil Arora",
    email: "nikhil.arora@gmail.com",
    city: "Noida",
    phone: "+91 98111 22004",
    source: "Manual",
    tourPackage: "Cab rental only",
    pickup: "Delhi",
    dropoff: "Mussoorie",
    travelDate: "2026-08-02",
    returnDate: "2026-08-04",
    cabType: "Maruti Dezire (4+1)",
    adults: 3,
    kids: 1,
    days: 3,
    tourPlan: "Mussoorie long weekend.",
    agent: "Aman",
    driver: "Rakesh Negi",
    vehicle: "HP-08-2210",
    total: 9800,
    advance: 3000,
    balance: 6800,
    status: "Advance Received",
  },
  {
    id: "BK-1194",
    customer: "Pooja Mehta",
    email: "pooja.mehta@gmail.com",
    city: "Jaipur",
    phone: "+91 98111 22005",
    source: "Google Ads",
    tourPackage: "9N/10D Complete Himachal Taxi Tour",
    pickup: "Delhi",
    dropoff: "Delhi",
    travelDate: "2026-07-28",
    returnDate: "2026-08-06",
    cabType: "Tempo Traveller (12+1)",
    adults: 11,
    kids: 1,
    days: 10,
    tourPlan: "Full Himachal circuit.",
    agent: "Priya",
    driver: "Deepak Chand",
    vehicle: "HP-64-1187",
    total: 62000,
    advance: 20000,
    balance: 42000,
    status: "Advance Received",
  },
  {
    id: "BK-1195",
    customer: "Harsh Vardhan",
    email: "harsh.v@gmail.com",
    city: "Lucknow",
    phone: "+91 98111 22006",
    source: "Website",
    tourPackage: "Custom / Plan your trip",
    pickup: "Chandigarh",
    dropoff: "Manali",
    travelDate: "2026-08-02",
    returnDate: "2026-08-07",
    cabType: "Innova CRYSTA (7+1)",
    adults: 4,
    kids: 2,
    days: 6,
    tourPlan: "Manali + Solang.",
    agent: "Sana",
    driver: "Suresh Thakur",
    vehicle: "HP-01-4521",
    total: 26500,
    advance: 10000,
    balance: 16500,
    status: "Balance Pending",
  },
  {
    id: "BK-1196",
    customer: "Anjali Desai",
    email: "anjali.desai@gmail.com",
    city: "Mumbai",
    phone: "+91 98111 22007",
    source: "Meta Ads",
    tourPackage: "5N/6D Shimla Manali Taxi Tour",
    pickup: "Delhi",
    dropoff: "Delhi",
    travelDate: "2026-07-29",
    returnDate: "2026-08-03",
    cabType: "Ertiga (6+1)",
    adults: 4,
    kids: 0,
    days: 6,
    tourPlan: "Couple trip ending today.",
    agent: "Priya",
    driver: "Vinod Kumar",
    vehicle: "HR-26-9981",
    total: 24000,
    advance: 24000,
    balance: 0,
    status: "Fully Paid",
  },
  {
    id: "BK-1197",
    customer: "Vikram Singh",
    email: "vikram.singh@gmail.com",
    city: "Amritsar",
    phone: "+91 98111 22008",
    source: "Manual",
    tourPackage: "Cab rental only",
    pickup: "Pathankot",
    dropoff: "Dalhousie",
    travelDate: "2026-08-03",
    returnDate: "2026-08-05",
    cabType: "Toyota Innova (7+1)",
    adults: 5,
    kids: 1,
    days: 3,
    tourPlan: "Started today · Dalhousie stay.",
    agent: "Aman",
    driver: "Rakesh Negi",
    vehicle: "HP-08-2210",
    total: 12500,
    advance: 5000,
    balance: 7500,
    status: "Advance Received",
  },
  {
    id: "BK-1198",
    customer: "Kritika Nair",
    email: "kritika.nair@gmail.com",
    city: "Bangalore",
    phone: "+91 98111 22009",
    source: "Google Ads",
    tourPackage: "8N/9D Leh & Ladakh Taxi Tour",
    pickup: "Delhi",
    dropoff: "Delhi",
    travelDate: "2026-07-27",
    returnDate: "2026-08-04",
    cabType: "Tempo Traveller (17+1)",
    adults: 14,
    kids: 0,
    days: 9,
    tourPlan: "Leh group still on road.",
    agent: "Priya",
    driver: "Deepak Chand",
    vehicle: "HP-64-1187",
    total: 98000,
    advance: 40000,
    balance: 58000,
    status: "Balance Pending",
  },
  // Upcoming trips (travel date after today)
  {
    id: "BK-1200",
    customer: "Aditya Kapoor",
    email: "aditya.kapoor@gmail.com",
    city: "Delhi",
    phone: "+91 98222 33001",
    source: "Website",
    tourPackage: "5N/6D Shimla Manali Taxi Tour",
    pickup: "Delhi",
    dropoff: "Delhi",
    travelDate: "2026-08-06",
    returnDate: "2026-08-11",
    cabType: "Innova CRYSTA (7+1)",
    adults: 4,
    kids: 2,
    days: 6,
    tourPlan: "Family vacation next week.",
    agent: "Priya",
    driver: "Suresh Thakur",
    vehicle: "HP-01-4521",
    total: 27500,
    advance: 8000,
    balance: 19500,
    status: "Advance Received",
  },
  {
    id: "BK-1201",
    customer: "Naina Bhatia",
    email: "naina.b@gmail.com",
    city: "Chandigarh",
    phone: "+91 98222 33002",
    source: "Google Ads",
    tourPackage: "Custom / Plan your trip",
    pickup: "Chandigarh",
    dropoff: "Kasauli",
    travelDate: "2026-08-07",
    returnDate: "2026-08-09",
    cabType: "Maruti Dezire (4+1)",
    adults: 2,
    kids: 0,
    days: 3,
    tourPlan: "Anniversary weekend.",
    agent: "Sana",
    driver: "Rakesh Negi",
    vehicle: "HP-08-2210",
    total: 7200,
    advance: 2000,
    balance: 5200,
    status: "Advance Pending",
  },
  {
    id: "BK-1202",
    customer: "Rohit Pal",
    email: "rohit.pal@gmail.com",
    city: "Ludhiana",
    phone: "+91 98222 33003",
    source: "Meta Ads",
    tourPackage: "4N/5D Pathankot Dharamshala Dalhousie Taxi Tour",
    pickup: "Ludhiana",
    dropoff: "Ludhiana",
    travelDate: "2026-08-08",
    returnDate: "2026-08-12",
    cabType: "Ertiga (6+1)",
    adults: 5,
    kids: 1,
    days: 5,
    tourPlan: "Dharamshala family run.",
    agent: "Aman",
    driver: "Vinod Kumar",
    vehicle: "HR-26-9981",
    total: 18500,
    advance: 7000,
    balance: 11500,
    status: "Advance Received",
  },
  {
    id: "BK-1203",
    customer: "Shreya Iyer",
    email: "shreya.iyer@gmail.com",
    city: "Hyderabad",
    phone: "+91 98222 33004",
    source: "Website",
    tourPackage: "9N/10D Kinnaur Spiti Taxi Tour",
    pickup: "Delhi",
    dropoff: "Delhi",
    travelDate: "2026-08-10",
    returnDate: "2026-08-19",
    cabType: "Tempo Traveller (12+1)",
    adults: 9,
    kids: 0,
    days: 10,
    tourPlan: "Spiti adventure group.",
    agent: "Priya",
    driver: "Deepak Chand",
    vehicle: "HP-64-1187",
    total: 78000,
    advance: 25000,
    balance: 53000,
    status: "Advance Received",
  },
  {
    id: "BK-1204",
    customer: "Farhan Ali",
    email: "farhan.ali@gmail.com",
    city: "Delhi",
    phone: "+91 98222 33005",
    source: "Manual",
    tourPackage: "Cab rental only",
    pickup: "Delhi",
    dropoff: "Shimla",
    travelDate: "2026-08-09",
    returnDate: "2026-08-09",
    cabType: "Toyota Innova (7+1)",
    adults: 6,
    kids: 0,
    days: 1,
    tourPlan: "One-way drop to Shimla.",
    agent: "Aman",
    driver: "Suresh Thakur",
    vehicle: "HP-01-4521",
    total: 6500,
    advance: 0,
    balance: 6500,
    status: "Balance Pending",
  },
  {
    id: "BK-1205",
    customer: "Tanvi Shah",
    email: "tanvi.shah@gmail.com",
    city: "Ahmedabad",
    phone: "+91 98222 33006",
    source: "Google Ads",
    tourPackage: "5N/6D Shimla Manali Taxi Tour",
    pickup: "Chandigarh",
    dropoff: "Chandigarh",
    travelDate: "2026-08-12",
    returnDate: "2026-08-17",
    cabType: "Innova CRYSTA (7+1)",
    adults: 3,
    kids: 2,
    days: 6,
    tourPlan: "Kids-friendly itinerary.",
    agent: "Sana",
    driver: "Vinod Kumar",
    vehicle: "HR-26-9981",
    total: 25500,
    advance: 10000,
    balance: 15500,
    status: "Advance Received",
  },
  {
    id: "BK-1206",
    customer: "Yash Malhotra",
    email: "yash.m@gmail.com",
    city: "Pune",
    phone: "+91 98222 33007",
    source: "Website",
    tourPackage: "Custom / Plan your trip",
    pickup: "Delhi",
    dropoff: "Manali",
    travelDate: "2026-08-14",
    returnDate: "2026-08-20",
    cabType: "Tempo Traveller (12+1)",
    adults: 10,
    kids: 2,
    days: 7,
    tourPlan: "College friends reunion.",
    agent: "Priya",
    driver: "Deepak Chand",
    vehicle: "HP-64-1187",
    total: 42000,
    advance: 15000,
    balance: 27000,
    status: "Advance Pending",
  },
  {
    id: "BK-1207",
    customer: "Isha Reddy",
    email: "isha.reddy@gmail.com",
    city: "Chennai",
    phone: "+91 98222 33008",
    source: "Meta Ads",
    tourPackage: "4N/5D Pathankot Dharamshala Dalhousie Taxi Tour",
    pickup: "Pathankot",
    dropoff: "Pathankot",
    travelDate: "2026-08-15",
    returnDate: "2026-08-19",
    cabType: "Ertiga (6+1)",
    adults: 4,
    kids: 1,
    days: 5,
    tourPlan: "Independence week trip.",
    agent: "Aman",
    driver: "Rakesh Negi",
    vehicle: "HP-08-2210",
    total: 16800,
    advance: 5000,
    balance: 11800,
    status: "Advance Received",
  },
  {
    id: "BK-1208",
    customer: "Kabir Suri",
    email: "kabir.suri@gmail.com",
    city: "Delhi",
    phone: "+91 98222 33009",
    source: "Google Ads",
    tourPackage: "8N/9D Leh & Ladakh Taxi Tour",
    pickup: "Delhi",
    dropoff: "Delhi",
    travelDate: "2026-08-20",
    returnDate: "2026-08-28",
    cabType: "Tempo Traveller (17+1)",
    adults: 12,
    kids: 0,
    days: 9,
    tourPlan: "Corporate Ladakh outing.",
    agent: "Priya",
    driver: "Deepak Chand",
    vehicle: "HP-64-1187",
    total: 112000,
    advance: 40000,
    balance: 72000,
    status: "Advance Received",
  },
  {
    id: "BK-1209",
    customer: "Diya Banerjee",
    email: "diya.b@gmail.com",
    city: "Kolkata",
    phone: "+91 98222 33010",
    source: "Website",
    tourPackage: "Cab rental only",
    pickup: "Shimla",
    dropoff: "Kasauli",
    travelDate: "2026-08-11",
    returnDate: "2026-08-11",
    cabType: "Maruti Dezire (4+1)",
    adults: 2,
    kids: 0,
    days: 1,
    tourPlan: "Day sightseeing.",
    agent: "Sana",
    driver: "Rakesh Negi",
    vehicle: "HP-08-2210",
    total: 4500,
    advance: 4500,
    balance: 0,
    status: "Fully Paid",
  },
];

export const bookings: Booking[] = bookingSeed.map((b, index) => ({
  ...b,
  website: b.website || defaultWebsites[index % defaultWebsites.length],
  history: bookingDummyHistory[b.id] ?? [
    {
      id: `BEV-${b.id}`,
      action: "created",
      label: "Booking created",
      detail: `Dummy · ${bookingRoute(b)}`,
      actor: "System",
      createdAt: "Earlier",
    },
  ],
}));

export type Driver = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  vehicle: string;
  vehicleType: string;
  vehicleCapacity?: number;
  fuelType?: "Petrol" | "Diesel" | "CNG" | "Electric";
  licenseNumber?: string;
  licenseExpiry?: string;
  rcNumber?: string;
  insuranceExpiry?: string;
  commission?: number;
  status: "Approved" | "Rejected" | "Deactivated";
  rating: number;
  trips: number;
  vendor?: boolean;
  documentsVerified?: boolean;
  notes?: string;
};

export const drivers: Driver[] = [
  { id: "DR-011", name: "Suresh Thakur", phone: "+91 94180 22110", address: "Sanjauli, Shimla, HP", vehicle: "HP-01-4521", vehicleType: "Innova Crysta", vehicleCapacity: 7, fuelType: "Diesel", licenseNumber: "HP0120210004521", licenseExpiry: "2028-04-12", rcNumber: "HP01AB4521", insuranceExpiry: "2027-01-15", commission: 12, status: "Approved", rating: 4.8, trips: 214, documentsVerified: true },
  { id: "DR-012", name: "Vinod Kumar", phone: "+91 98051 34210", address: "Sector 22, Chandigarh", vehicle: "HR-26-9981", vehicleType: "Ertiga", vehicleCapacity: 6, fuelType: "Petrol", licenseNumber: "HR2620190009981", licenseExpiry: "2026-11-02", rcNumber: "HR26CD9981", insuranceExpiry: "2026-09-30", commission: 10, status: "Approved", rating: 4.6, trips: 152, documentsVerified: true },
  { id: "DR-013", name: "Rakesh Negi", phone: "+91 90154 88231", address: "Kasauli Road, Solan, HP", vehicle: "HP-08-2210", vehicleType: "Swift Dzire", vehicleCapacity: 4, fuelType: "Diesel", licenseNumber: "HP0820180002210", licenseExpiry: "2027-06-18", rcNumber: "HP08EF2210", insuranceExpiry: "2026-12-05", commission: 10, status: "Approved", rating: 4.9, trips: 301, documentsVerified: true },
  { id: "DR-014", name: "Deepak Chand", phone: "+91 88172 09441", address: "Kullu, HP", vehicle: "HP-64-1187", vehicleType: "Tempo Traveller", vehicleCapacity: 14, fuelType: "Diesel", licenseNumber: "HP6420170001187", licenseExpiry: "2025-08-21", rcNumber: "HP64GH1187", insuranceExpiry: "2026-03-11", commission: 14, status: "Approved", rating: 4.7, trips: 98, documentsVerified: true },
  { id: "DR-015", name: "Mohit Sharma", phone: "+91 97290 11023", address: "Vendor fleet · Zirakpur, PB", vehicle: "PB-65-7712", vehicleType: "Innova Crysta", vehicleCapacity: 7, fuelType: "Diesel", licenseNumber: "PB6520190007712", licenseExpiry: "2027-02-14", rcNumber: "PB65JK7712", insuranceExpiry: "2026-07-20", commission: 18, status: "Rejected", rating: 4.5, trips: 76, vendor: true, documentsVerified: false, notes: "Pending updated insurance copy" },
  { id: "DR-016", name: "Ajay Bisht", phone: "+91 96201 44982", address: "Vendor fleet · Kalka, HR", vehicle: "HP-33-5510", vehicleType: "Tempo Traveller", vehicleCapacity: 14, fuelType: "Diesel", licenseNumber: "HP3320180005510", licenseExpiry: "2028-01-09", rcNumber: "HP33LM5510", insuranceExpiry: "2027-05-17", commission: 16, status: "Deactivated", rating: 4.8, trips: 189, vendor: true, documentsVerified: true },
];

export type QuoteStage = "Draft" | "Sent" | "Viewed" | "Accepted" | "Expired";

export type Quote = {
  id: string;
  leadId?: string;
  customer: string;
  route: string;
  days: number;
  cabType: string;
  amount: number;
  stage: QuoteStage;
  sentVia: ("WhatsApp" | "PDF" | "Email")[];
  note?: string;
};

export const quotes: Quote[] = [
  { id: "QT-3312", leadId: "LD-2401", customer: "Ritika Sharma", route: "Delhi → Delhi", days: 6, cabType: "Innova CRYSTA (7+1)", amount: 24000, stage: "Sent", sentVia: ["WhatsApp", "PDF"], note: "Family Shimla Manali package" },
  { id: "QT-3311", leadId: "LD-2400", customer: "Karan Bhandari", route: "Chandigarh → Chandigarh", days: 10, cabType: "Tempo Traveller (12+1)", amount: 42000, stage: "Viewed", sentVia: ["WhatsApp", "Email"] },
  { id: "QT-3310", leadId: "LD-2399", customer: "Neha Kapoor", route: "Delhi → Delhi", days: 2, cabType: "Maruti Dezire (4+1)", amount: 4200, stage: "Accepted", sentVia: ["WhatsApp", "PDF", "Email"] },
  { id: "QT-3309", leadId: "LD-2394", customer: "Sameer Chauhan", route: "Pathankot → Pathankot", days: 5, cabType: "Toyota Innova (7+1)", amount: 16000, stage: "Draft", sentVia: [] },
  { id: "QT-3308", leadId: "LD-2396", customer: "Rohan Malhotra", route: "Delhi → Delhi", days: 9, cabType: "Tempo Traveller (17+1)", amount: 46800, stage: "Expired", sentVia: ["WhatsApp"] },
];

export type Trip = {
  id: string;
  date: string;
  time: string;
  customer: string;
  route: string;
  driver: string;
  vehicle: string;
  status: "Scheduled" | "In Progress" | "Completed" | "Payment Pending";
};

export const trips: Trip[] = [
  { id: "TR-501", date: "30 Jul", time: "06:00", customer: "Ananya Rao", route: "Chandigarh → Shimla", driver: "Suresh Thakur", vehicle: "HP-01-4521", status: "In Progress" },
  { id: "TR-502", date: "30 Jul", time: "14:30", customer: "Pooja Rawat", route: "Shimla → Kasauli", driver: "Rakesh Negi", vehicle: "HP-08-2210", status: "Payment Pending" },
  { id: "TR-503", date: "31 Jul", time: "05:30", customer: "Arjun Sethi", route: "Delhi → Manali", driver: "Deepak Chand", vehicle: "HP-64-1187", status: "Scheduled" },
  { id: "TR-504", date: "1 Aug", time: "07:00", customer: "Manish Verma", route: "Delhi → Shimla", driver: "Vinod Kumar", vehicle: "HR-26-9981", status: "Scheduled" },
  { id: "TR-505", date: "29 Jul", time: "08:00", customer: "Ishita Bose", route: "Delhi → Mussoorie", driver: "Rakesh Negi", vehicle: "HP-08-2210", status: "Completed" },
];

export type Agent = {
  name: string;
  assigned: number;
  contacted: number;
  quoted: number;
  confirmed: number;
  revenue: number;
  missedFollowUps: number;
  conversion: number;
  avgResponse: string;
};

export const agents: Agent[] = [
  { name: "Aman", assigned: 42, contacted: 38, quoted: 24, confirmed: 14, revenue: 186500, missedFollowUps: 2, conversion: 33, avgResponse: "6m" },
  { name: "Priya", assigned: 39, contacted: 36, quoted: 27, confirmed: 17, revenue: 214200, missedFollowUps: 1, conversion: 44, avgResponse: "4m" },
  { name: "Sana", assigned: 31, contacted: 25, quoted: 16, confirmed: 8, revenue: 98700, missedFollowUps: 5, conversion: 26, avgResponse: "12m" },
];

export const revenueTrend = [
  { day: "Mon", revenue: 42000, leads: 18 },
  { day: "Tue", revenue: 38500, leads: 22 },
  { day: "Wed", revenue: 51200, leads: 19 },
  { day: "Thu", revenue: 47800, leads: 25 },
  { day: "Fri", revenue: 63400, leads: 31 },
  { day: "Sat", revenue: 71200, leads: 34 },
  { day: "Sun", revenue: 58900, leads: 27 },
];

export const revenueTrendBySource: Record<string, { day: string; revenue: number; leads: number }[]> = {
  "Google Ads": [
    { day: "Mon", revenue: 15960, leads: 7 },
    { day: "Tue", revenue: 14630, leads: 8 },
    { day: "Wed", revenue: 19456, leads: 7 },
    { day: "Thu", revenue: 18164, leads: 10 },
    { day: "Fri", revenue: 24092, leads: 12 },
    { day: "Sat", revenue: 27056, leads: 13 },
    { day: "Sun", revenue: 22382, leads: 10 },
  ],
  "Meta Ads": [
    { day: "Mon", revenue: 11340, leads: 5 },
    { day: "Tue", revenue: 10395, leads: 6 },
    { day: "Wed", revenue: 13824, leads: 5 },
    { day: "Thu", revenue: 12906, leads: 7 },
    { day: "Fri", revenue: 17118, leads: 8 },
    { day: "Sat", revenue: 19224, leads: 9 },
    { day: "Sun", revenue: 15903, leads: 7 },
  ],
  Website: [
    { day: "Mon", revenue: 9240, leads: 4 },
    { day: "Tue", revenue: 8470, leads: 5 },
    { day: "Wed", revenue: 11264, leads: 4 },
    { day: "Thu", revenue: 10516, leads: 5 },
    { day: "Fri", revenue: 13948, leads: 7 },
    { day: "Sat", revenue: 15664, leads: 8 },
    { day: "Sun", revenue: 12958, leads: 6 },
  ],
  Manual: [
    { day: "Mon", revenue: 5460, leads: 2 },
    { day: "Tue", revenue: 5005, leads: 3 },
    { day: "Wed", revenue: 6656, leads: 3 },
    { day: "Thu", revenue: 6214, leads: 3 },
    { day: "Fri", revenue: 8242, leads: 4 },
    { day: "Sat", revenue: 9256, leads: 4 },
    { day: "Sun", revenue: 7657, leads: 4 },
  ],
};

export function getRevenueTrendForSource(source?: string | null) {
  if (source && revenueTrendBySource[source]) {
    return revenueTrendBySource[source];
  }
  return revenueTrend;
}

export const sourceSplit = [
  { source: "Google Ads", value: 38, color: "#f5a524" },
  { source: "Meta Ads", value: 27, color: "#8b5cf6" },
  { source: "Website", value: 22, color: "#0d9488" },
  { source: "Manual", value: 13, color: "#64748b" },
];

export type PermissionAction = "view" | "create" | "edit" | "delete" | "assign" | "export";

export type SystemPermission = {
  id: string;
  key: string;
  module: string;
  action: PermissionAction;
  label: string;
  description?: string;
};

export type MemberRole = "Super Admin" | "Admin" | "Employee";
export type MemberStatus = "Active" | "Inactive";

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  department: string;
  role: MemberRole;
  status: MemberStatus;
  permissionKeys: string[];
};

const permissionDefs: Array<{
  module: string;
  actions: Array<{ action: PermissionAction; label: string; description?: string }>;
}> = [
  {
    module: "Dashboard",
    actions: [
      { action: "view", label: "View Dashboard", description: "See CRM overview and KPIs" },
      { action: "export", label: "Export Dashboard", description: "Download reports from dashboard" },
    ],
  },
  {
    module: "Leads",
    actions: [
      { action: "view", label: "View Leads" },
      { action: "create", label: "Create Lead" },
      { action: "edit", label: "Edit Lead" },
      { action: "delete", label: "Delete Lead" },
      { action: "assign", label: "Assign Lead", description: "Assign leads to agents" },
    ],
  },
  {
    module: "Bookings",
    actions: [
      { action: "view", label: "View Bookings" },
      { action: "create", label: "Create Booking" },
      { action: "edit", label: "Edit Booking" },
      { action: "delete", label: "Delete Booking" },
    ],
  },
  {
    module: "Booking & Drivers",
    actions: [
      { action: "view", label: "View Assignments", description: "See booking–driver mapping" },
      { action: "assign", label: "Assign Driver", description: "Assign or reassign drivers to bookings" },
    ],
  },
  {
    module: "Itineraries",
    actions: [
      { action: "view", label: "View Itineraries" },
      { action: "create", label: "Create Itinerary" },
      { action: "edit", label: "Edit Itinerary" },
      { action: "delete", label: "Delete Itinerary" },
    ],
  },
  {
    module: "Hotels",
    actions: [
      { action: "view", label: "View Hotels" },
      { action: "create", label: "Create Hotel Template" },
      { action: "edit", label: "Edit Hotel Template" },
      { action: "delete", label: "Delete Hotel Template" },
    ],
  },
  {
    module: "Drivers & Vehicles",
    actions: [
      { action: "view", label: "View Drivers" },
      { action: "create", label: "Create Driver" },
      { action: "edit", label: "Edit Driver" },
      { action: "delete", label: "Delete Driver" },
    ],
  },
  {
    module: "Roles & Permissions",
    actions: [
      { action: "view", label: "View Roles", description: "See members and system permissions" },
      { action: "create", label: "Invite Member" },
      { action: "edit", label: "Edit Member & Permissions" },
      { action: "delete", label: "Remove Member" },
    ],
  },
];

function slugModule(module: string) {
  return module
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

export const systemPermissions: SystemPermission[] = permissionDefs.flatMap((mod, mi) =>
  mod.actions.map((a, ai) => ({
    id: `SP-${mi + 1}${ai + 1}`,
    key: `${slugModule(mod.module)}.${a.action}`,
    module: mod.module,
    action: a.action,
    label: a.label,
    description: a.description,
  }))
);

export const permissionModules = [...new Set(systemPermissions.map((p) => p.module))];

export const allPermissionKeys = systemPermissions.map((p) => p.key);

const adminDefaultKeys = systemPermissions
  .filter((p) => !(p.module === "Roles & Permissions" && p.action === "delete"))
  .map((p) => p.key);

const employeeDefaultKeys = systemPermissions
  .filter((p) =>
    ["leads.view", "leads.create", "leads.edit", "bookings.view", "bookings.create", "booking.and.drivers.view", "itineraries.view", "hotels.view", "drivers.and.vehicles.view", "dashboard.view"].includes(
      p.key
    )
  )
  .map((p) => p.key);

export function defaultPermissionsForRole(role: MemberRole): string[] {
  if (role === "Super Admin") return [...allPermissionKeys];
  if (role === "Admin") return [...adminDefaultKeys];
  return [...employeeDefaultKeys];
}

export const members: Member[] = [
  {
    id: "MB-001",
    name: "Priya Anand",
    email: "priya@mahasutravels.com",
    phone: "+91 98170 11001",
    password: "Priya@123",
    department: "Operations",
    role: "Super Admin",
    status: "Active",
    permissionKeys: defaultPermissionsForRole("Super Admin"),
  },
  {
    id: "MB-002",
    name: "Aman Verma",
    email: "aman@mahasutravels.com",
    phone: "+91 98170 11002",
    password: "Aman@123",
    department: "Sales",
    role: "Admin",
    status: "Active",
    permissionKeys: defaultPermissionsForRole("Admin"),
  },
  {
    id: "MB-003",
    name: "Sana Kapoor",
    email: "sana@mahasutravels.com",
    phone: "+91 98170 11003",
    password: "Sana@123",
    department: "Sales",
    role: "Employee",
    status: "Active",
    permissionKeys: defaultPermissionsForRole("Employee"),
  },
];

export type RoleModulePerm = {
  module: string;
  superAdmin: string;
  admin: string;
  user: string;
};

/** @deprecated Prefer systemPermissions + members */
export const rolePermissions: RoleModulePerm[] = permissionModules.map((module) => ({
  module,
  superAdmin: "Full access",
  admin: module === "Roles & Permissions" ? "View, edit" : "Full access",
  user: "View assigned only",
}));

export const statusColor: Record<string, string> = {
  New: "secondary",
  Contacted: "violet",
  Quoted: "marigold",
  "Follow-up": "signal",
  Confirmed: "teal",
  Lost: "outline",
  "Advance Pending": "signal",
  "Advance Received": "marigold",
  "Balance Pending": "signal",
  "Fully Paid": "teal",
  Cancelled: "outline",
  Refunded: "outline",
  Available: "teal",
  "On Trip": "marigold",
  "Off Duty": "outline",
  Approved: "teal",
  Rejected: "signal",
  Deactivated: "outline",
  Draft: "outline",
  Active: "teal",
  Inactive: "outline",
  Archived: "outline",
  Sent: "violet",
  Viewed: "marigold",
  Accepted: "teal",
  Expired: "signal",
  Scheduled: "violet",
  "In Progress": "marigold",
  Completed: "teal",
  "Payment Pending": "signal",
};

export type AdPlatform = "Google Ads" | "Meta Ads" | "Website SEO" | "Offline / Print" | "Other";

export type AdSpendEntry = {
  id: string;
  platform: AdPlatform;
  website?: string;
  amount: number;
  date: string;
  campaignName?: string;
  leadsGenerated?: number;
  notes?: string;
  createdAt: string;
};

export const adSpends: AdSpendEntry[] = [
  {
    id: "SP-101",
    platform: "Google Ads",
    website: "mahasutravels.com",
    amount: 32000,
    date: "2026-08-01",
    campaignName: "Shimla Manali Summer Search Campaign",
    leadsGenerated: 18,
    notes: "Targeting Delhi NCR & Punjab search terms.",
    createdAt: "2026-08-01",
  },
  {
    id: "SP-102",
    platform: "Meta Ads",
    website: "mahasutravels.com",
    amount: 22000,
    date: "2026-08-02",
    campaignName: "Himachal Family Tour Reels & IG Lead Gen",
    leadsGenerated: 14,
    notes: "Carousel ad featuring Innova Crysta & Tempo Traveller packages.",
    createdAt: "2026-08-02",
  },
  {
    id: "SP-103",
    platform: "Google Ads",
    website: "spitivalleytours.com",
    amount: 18500,
    date: "2026-08-03",
    campaignName: "Spiti & Kinnaur Expedition Search Ads",
    leadsGenerated: 9,
    notes: "High intent adventure keywords.",
    createdAt: "2026-08-03",
  },
  {
    id: "SP-104",
    platform: "Meta Ads",
    website: "himachaltaxiservice.in",
    amount: 14000,
    date: "2026-08-04",
    campaignName: "Chandigarh Pickups & One-way Cab Ads",
    leadsGenerated: 8,
    notes: "FB Lead form targeting weekend travelers.",
    createdAt: "2026-08-04",
  },
  {
    id: "SP-105",
    platform: "Website SEO",
    website: "mahasutravels.com",
    amount: 8000,
    date: "2026-08-05",
    campaignName: "SEO Backlinks & Content Marketing",
    leadsGenerated: 12,
    notes: "Monthly local SEO optimization.",
    createdAt: "2026-08-05",
  },
];
