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

export type Lead = {
  id: string;
  name: string;
  email: string;
  city: string;
  phone: string;
  source: "Website" | "Google Ads" | "Meta Ads" | "Manual";
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
};

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
  { id: "LD-2401", name: "Ritika Sharma", email: "ritika.sharma@gmail.com", city: "Delhi", phone: "+91 98170 22314", source: "Google Ads", tourPackage: "5N/6D Shimla Manali Taxi Tour", pickup: "Delhi", dropoff: "Delhi", travelDate: "2026-08-12", returnDate: "2026-08-17", cabType: "Innova CRYSTA (7+1)", adults: 4, kids: 2, days: 6, tourPlan: "Family trip covering Shimla mall road and Manali local sightseeing.", status: "New", agent: "Aman", budget: 24000, lastActivity: "6m ago", comments: [{ id: "CM-1", text: "Called once — asked for Innova Crysta quote with hotel options.", author: "Aman", createdAt: "Today, 11:40 AM" }] },
  { id: "LD-2400", name: "Karan Bhandari", email: "karan.b@outlook.com", city: "Chandigarh", phone: "+91 90158 77021", source: "Meta Ads", tourPackage: "9N/10D Complete Himachal Taxi Tour", pickup: "Chandigarh", dropoff: "Chandigarh", travelDate: "2026-08-15", returnDate: "2026-08-24", cabType: "Tempo Traveller (12+1)", adults: 10, kids: 2, days: 10, tourPlan: "Group tour — Shimla, Manali, Dharamshala, Dalhousie.", status: "Contacted", agent: "Priya", budget: 42000, lastActivity: "22m ago", comments: [{ id: "CM-2", text: "WhatsApp intro sent. Waiting on final pax count.", author: "Priya", createdAt: "Today, 10:55 AM" }, { id: "CM-3", text: "Group is 10 adults + 2 kids confirmed.", author: "Priya", createdAt: "Today, 11:18 AM" }] },
  { id: "LD-2399", name: "Neha Kapoor", email: "neha.kapoor@yahoo.com", city: "Noida", phone: "+91 99889 10234", source: "Website", tourPackage: "Cab rental only", pickup: "Delhi", dropoff: "Delhi", travelDate: "2026-08-09", returnDate: "2026-08-10", cabType: "Maruti Dezire (4+1)", adults: 3, kids: 1, days: 2, tourPlan: "Weekend cab for Mussoorie day trip.", status: "Quoted", agent: "Aman", budget: 4200, lastActivity: "1h ago" },
  { id: "LD-2398", name: "Vivek Thakur", email: "vivek.thakur@gmail.com", city: "Shimla", phone: "+91 88170 44521", source: "Manual", tourPackage: "9N/10D Kinnaur Spiti Taxi Tour", pickup: "Delhi", dropoff: "Delhi", travelDate: "2026-08-10", returnDate: "2026-08-11", cabType: "Ertiga (6+1)", adults: 3, kids: 0, days: 2, tourPlan: "Short enquiry for Spiti dates — want Ertiga quote.", status: "Follow-up", agent: "Sana", budget: 5600, lastActivity: "2h ago", comments: [{ id: "CM-4", text: "Follow-up due tomorrow morning if no reply.", author: "Sana", createdAt: "Yesterday, 4:20 PM" }] },
  { id: "LD-2397", name: "Ananya Rao", email: "ananya.rao@gmail.com", city: "Chandigarh", phone: "+91 98765 22109", source: "Google Ads", tourPackage: "5N/6D Shimla Manali Taxi Tour", pickup: "Chandigarh", dropoff: "Chandigarh", travelDate: "2026-08-18", returnDate: "2026-08-23", cabType: "Innova CRYSTA (7+1)", adults: 5, kids: 2, days: 6, tourPlan: "Honeymoon + parents travelling together.", status: "Confirmed", agent: "Priya", budget: 24000, lastActivity: "3h ago" },
  { id: "LD-2396", name: "Rohan Malhotra", email: "rohan.m@gmail.com", city: "Gurugram", phone: "+91 97190 33452", source: "Meta Ads", tourPackage: "8N/9D Leh & Ladakh Taxi Tour", pickup: "Delhi", dropoff: "Delhi", travelDate: "2026-08-22", returnDate: "2026-08-30", cabType: "Tempo Traveller (17+1)", adults: 12, kids: 2, days: 9, tourPlan: "Corporate team outing to Ladakh.", status: "Lost", agent: "Sana", budget: 46800, lastActivity: "5h ago" },
  { id: "LD-2395", name: "Divya Negi", email: "divya.negi@gmail.com", city: "Solan", phone: "+91 96543 88012", source: "Website", tourPackage: "Custom / Plan your trip", pickup: "Kalka", dropoff: "Kalka", travelDate: "2026-08-11", returnDate: "2026-08-12", cabType: "Maruti Dezire (4+1)", adults: 2, kids: 1, days: 2, tourPlan: "Apple orchard visit near Narkanda.", status: "New", agent: "Aman", budget: 4200, lastActivity: "6h ago", duplicate: true },
  { id: "LD-2394", name: "Sameer Chauhan", email: "sameer.c@gmail.com", city: "Pathankot", phone: "+91 90200 11987", source: "Google Ads", tourPackage: "4N/5D Pathankot Dharamshala Dalhousie Taxi Tour", pickup: "Pathankot", dropoff: "Pathankot", travelDate: "2026-08-25", returnDate: "2026-08-29", cabType: "Toyota Innova (7+1)", adults: 5, kids: 1, days: 5, tourPlan: "Family trip with McLeod Ganj and Khajjiar.", status: "Quoted", agent: "Priya", budget: 16000, lastActivity: "8h ago" },
];

export const leads: Lead[] = leadSeed.map((l) => ({
  ...l,
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

export type BookingStatus =
  | "Advance Pending"
  | "Advance Received"
  | "Balance Pending"
  | "Fully Paid"
  | "Cancelled"
  | "Refunded";

export type Hotel = {
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

export type Booking = {
  id: string;
  customer: string;
  email: string;
  city: string;
  phone?: string;
  source: Lead["source"];
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

export function bookingRoute(b: Pick<Booking, "pickup" | "dropoff" | "tourPackage">) {
  if (b.pickup && b.dropoff) return `${b.pickup} → ${b.dropoff}`;
  if (b.tourPackage) return b.tourPackage;
  return "—";
}

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
      hotelName: "Hotel Willow Banks",
      address: "The Mall, Shimla, HP",
      checkIn: "2026-08-18",
      checkOut: "2026-08-20",
      roomType: "Deluxe Mountain View",
      roomCount: 2,
      amount: 7200,
      referenceNumber: "WB-RES-4471",
      contactNumber: "+91 94185 22011",
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
      hotelName: "Snow Valley Resorts",
      address: "Log Huts Rd, Manali, HP",
      checkIn: "2026-08-01",
      checkOut: "2026-08-05",
      roomType: "Family Suite",
      roomCount: 3,
      amount: 21000,
      referenceNumber: "SVR-8890",
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
];

export const bookings: Booking[] = bookingSeed.map((b) => ({
  ...b,
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
  status: "Available" | "On Trip" | "Off Duty";
  rating: number;
  trips: number;
  vendor?: boolean;
  documentsVerified?: boolean;
  notes?: string;
};

export const drivers: Driver[] = [
  { id: "DR-011", name: "Suresh Thakur", phone: "+91 94180 22110", address: "Sanjauli, Shimla, HP", vehicle: "HP-01-4521", vehicleType: "Innova Crysta", vehicleCapacity: 7, fuelType: "Diesel", licenseNumber: "HP0120210004521", licenseExpiry: "2028-04-12", rcNumber: "HP01AB4521", insuranceExpiry: "2027-01-15", commission: 12, status: "On Trip", rating: 4.8, trips: 214, documentsVerified: true },
  { id: "DR-012", name: "Vinod Kumar", phone: "+91 98051 34210", address: "Sector 22, Chandigarh", vehicle: "HR-26-9981", vehicleType: "Ertiga", vehicleCapacity: 6, fuelType: "Petrol", licenseNumber: "HR2620190009981", licenseExpiry: "2026-11-02", rcNumber: "HR26CD9981", insuranceExpiry: "2026-09-30", commission: 10, status: "Available", rating: 4.6, trips: 152, documentsVerified: true },
  { id: "DR-013", name: "Rakesh Negi", phone: "+91 90154 88231", address: "Kasauli Road, Solan, HP", vehicle: "HP-08-2210", vehicleType: "Swift Dzire", vehicleCapacity: 4, fuelType: "Diesel", licenseNumber: "HP0820180002210", licenseExpiry: "2027-06-18", rcNumber: "HP08EF2210", insuranceExpiry: "2026-12-05", commission: 10, status: "Available", rating: 4.9, trips: 301, documentsVerified: true },
  { id: "DR-014", name: "Deepak Chand", phone: "+91 88172 09441", address: "Kullu, HP", vehicle: "HP-64-1187", vehicleType: "Tempo Traveller", vehicleCapacity: 14, fuelType: "Diesel", licenseNumber: "HP6420170001187", licenseExpiry: "2025-08-21", rcNumber: "HP64GH1187", insuranceExpiry: "2026-03-11", commission: 14, status: "On Trip", rating: 4.7, trips: 98, documentsVerified: true },
  { id: "DR-015", name: "Mohit Sharma", phone: "+91 97290 11023", address: "Vendor fleet · Zirakpur, PB", vehicle: "PB-65-7712", vehicleType: "Innova Crysta", vehicleCapacity: 7, fuelType: "Diesel", licenseNumber: "PB6520190007712", licenseExpiry: "2027-02-14", rcNumber: "PB65JK7712", insuranceExpiry: "2026-07-20", commission: 18, status: "Off Duty", rating: 4.5, trips: 76, vendor: true, documentsVerified: false, notes: "Pending updated insurance copy" },
  { id: "DR-016", name: "Ajay Bisht", phone: "+91 96201 44982", address: "Vendor fleet · Kalka, HR", vehicle: "HP-33-5510", vehicleType: "Tempo Traveller", vehicleCapacity: 14, fuelType: "Diesel", licenseNumber: "HP3320180005510", licenseExpiry: "2028-01-09", rcNumber: "HP33LM5510", insuranceExpiry: "2027-05-17", commission: 16, status: "Available", rating: 4.8, trips: 189, vendor: true, documentsVerified: true },
];

export type QuoteStage = "Draft" | "Sent" | "Viewed" | "Accepted" | "Expired";

export type Quote = {
  id: string;
  customer: string;
  route: string;
  days: number;
  cabType: string;
  amount: number;
  stage: QuoteStage;
  sentVia: ("WhatsApp" | "PDF" | "Email")[];
};

export const quotes: Quote[] = [
  { id: "QT-3312", customer: "Ritika Sharma", route: "Delhi → Shimla → Delhi", days: 3, cabType: "Innova Crysta", amount: 14500, stage: "Sent", sentVia: ["WhatsApp", "PDF"] },
  { id: "QT-3311", customer: "Karan Bhandari", route: "Chandigarh → Manali → Chandigarh", days: 4, cabType: "Tempo Traveller", amount: 32000, stage: "Viewed", sentVia: ["WhatsApp", "Email"] },
  { id: "QT-3310", customer: "Neha Kapoor", route: "Delhi → Mussoorie → Delhi", days: 2, cabType: "Swift Dzire", amount: 8200, stage: "Accepted", sentVia: ["WhatsApp", "PDF", "Email"] },
  { id: "QT-3309", customer: "Sameer Chauhan", route: "Delhi → Dharamshala → Delhi", days: 4, cabType: "Innova Crysta", amount: 16500, stage: "Draft", sentVia: [] },
  { id: "QT-3308", customer: "Rohan Malhotra", route: "Delhi → Manali → Delhi", days: 5, cabType: "Tempo Traveller", amount: 38000, stage: "Expired", sentVia: ["WhatsApp"] },
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

export const sourceSplit = [
  { source: "Google Ads", value: 38, color: "var(--marigold)" },
  { source: "Meta Ads", value: 27, color: "var(--violet)" },
  { source: "Website", value: 22, color: "var(--teal)" },
  { source: "Manual", value: 13, color: "var(--slate-soft)" },
];

export type AutomationRule = {
  id: string;
  trigger: string;
  action: string;
  category: "Follow-up" | "Trip" | "Payment";
  enabled: boolean;
  firedToday: number;
};

export const automationRules: AutomationRule[] = [
  { id: "AR-01", trigger: "Quote sent to customer", action: "Create follow-up task for agent, due in 24h", category: "Follow-up", enabled: true, firedToday: 12 },
  { id: "AR-02", trigger: "No response from lead in 24h", action: "Send WhatsApp reminder + notify agent", category: "Follow-up", enabled: true, firedToday: 7 },
  { id: "AR-03", trigger: "Travel date is tomorrow", action: "Remind ops team to confirm driver & vehicle details", category: "Trip", enabled: true, firedToday: 3 },
  { id: "AR-04", trigger: "Advance payment pending 48h before trip", action: "Send payment reminder to customer", category: "Payment", enabled: true, firedToday: 2 },
  { id: "AR-05", trigger: "Missed inbound call", action: "Create urgent callback task, assign to duty agent", category: "Follow-up", enabled: true, firedToday: 5 },
  { id: "AR-06", trigger: "Booking balance pending after trip completion", action: "Send balance due reminder every 2 days", category: "Payment", enabled: false, firedToday: 0 },
];

export type CallLog = {
  id: string;
  direction: "Inbound" | "Outbound";
  customer: string;
  phone: string;
  agent: string;
  duration: string;
  time: string;
  status: "Answered" | "Missed" | "Voicemail";
  recorded: boolean;
};

export const callLogs: CallLog[] = [
  { id: "CL-8821", direction: "Inbound", customer: "Ritika Sharma", phone: "+91 98170 22314", agent: "Aman", duration: "4m 12s", time: "Today, 11:42 AM", status: "Answered", recorded: true },
  { id: "CL-8820", direction: "Outbound", customer: "Karan Bhandari", phone: "+91 90158 77021", agent: "Priya", duration: "2m 05s", time: "Today, 11:10 AM", status: "Answered", recorded: true },
  { id: "CL-8819", direction: "Inbound", customer: "Unknown caller", phone: "+91 88170 44521", agent: "—", duration: "0s", time: "Today, 10:52 AM", status: "Missed", recorded: false },
  { id: "CL-8818", direction: "Outbound", customer: "Neha Kapoor", phone: "+91 99889 10234", agent: "Aman", duration: "6m 40s", time: "Today, 10:18 AM", status: "Answered", recorded: true },
  { id: "CL-8817", direction: "Inbound", customer: "Vivek Thakur", phone: "+91 88170 44521", agent: "Sana", duration: "1m 02s", time: "Today, 09:47 AM", status: "Voicemail", recorded: true },
];

export type RoleModulePerm = {
  module: string;
  superAdmin: string;
  admin: string;
  user: string;
};

export const rolePermissions: RoleModulePerm[] = [
  { module: "Leads", superAdmin: "Full access", admin: "Assign, view all", user: "View assigned only" },
  { module: "Quotes", superAdmin: "Full access", admin: "Create, edit, send", user: "Create, send own" },
  { module: "Bookings", superAdmin: "Full access", admin: "Create, edit, cancel", user: "View, edit own" },
  { module: "Drivers & Vehicles", superAdmin: "Full access", admin: "Add, assign", user: "View only" },
  { module: "Reports & Dashboards", superAdmin: "Full access", admin: "Team dashboard", user: "Own performance" },
  { module: "Automation Rules", superAdmin: "Full access", admin: "View only", user: "No access" },
];

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
  Draft: "outline",
  Sent: "violet",
  Viewed: "marigold",
  Accepted: "teal",
  Expired: "signal",
  Scheduled: "violet",
  "In Progress": "marigold",
  Completed: "teal",
  "Payment Pending": "signal",
  Answered: "teal",
  Missed: "signal",
  Voicemail: "violet",
};
