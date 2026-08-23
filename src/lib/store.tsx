"use client";

import * as React from "react";
import {
  Lead,
  Booking,
  Driver,
  Quote,
  Hotel,
  HotelTemplate,
  ItineraryTemplate,
  LeadCustomItinerary,
  Member,
  SystemPermission,
  AdSpendEntry,
  quotes as seedQuotes,
  members as seedMembers,
  systemPermissions as seedSystemPermissions,
  genId,
  makeLeadHistoryEvent,
} from "@/lib/data";
import {
  activityFromApi,
  commentFromApi,
  createLeadApi,
  createLeadCommentApi,
  deleteLeadApi,
  fetchAssignees,
  fetchLeadActivity,
  fetchLeadComments,
  fetchLeadMasters,
  fetchLeads,
  leadFromApi,
  leadToWritePayload,
  updateLeadApi,
  type LeadItineraryOverlay,
  type LeadSourceMasterApi,
  type LeadStatusMasterApi,
  type LeadWritePayload,
  type WebsiteMasterApi,
} from "@/lib/leads-api";
import {
  createHotelApi,
  deleteHotelApi,
  fetchHotels,
  hotelFromApi,
  hotelToWritePayload,
  updateHotelApi,
} from "@/lib/hotels-api";
import {
  createItineraryApi,
  deleteItineraryApi,
  fetchItineraries,
  itineraryFromApi,
  itineraryToWritePayload,
  updateItineraryApi,
} from "@/lib/itineraries-api";
import {
  createDriverApi,
  deleteDriverApi,
  driverFromApi,
  driverToWritePayload,
  fetchDrivers,
  updateDriverApi,
} from "@/lib/drivers-api";
import {
  adSpendFromApi,
  adSpendToWritePayload,
  createAdSpendApi,
  deleteAdSpendApi,
  fetchAdSpends,
  updateAdSpendApi,
} from "@/lib/ad-spends-api";
import {
  bookingFromApi,
  bookingToWritePayload,
  createBookingApi,
  deleteBookingApi,
  fetchBookings,
  updateBookingApi,
} from "@/lib/bookings-api";
import { slugify } from "@/lib/itinerary-utils";

export type LeadFormValues = {
  name: string;
  email: string;
  city: string;
  phone: string;
  source: string;
  website?: string;
  tourPackage: string;
  itineraryTemplateId?: string | null;
  vehicleId?: string | null;
  pickup: string;
  drop: string;
  pickupDate: string;
  dropDate: string;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  car: string;
  adults: number;
  kids: number;
  days: number;
  notes: string;
  status: Lead["status"];
  assignedToId: string | null;
  price: number;
};

type State = {
  leads: Lead[];
  bookings: Booking[];
  drivers: Driver[];
  quotes: Quote[];
  itineraries: ItineraryTemplate[];
  hotelTemplates: HotelTemplate[];
  members: Member[];
  systemPermissions: SystemPermission[];
  adSpends: AdSpendEntry[];
  leadItineraries: Record<string, LeadItineraryOverlay>;
};

export type AssigneeOption = { id: string; name: string; email: string; role: string };
export type LeadStatusOption = LeadStatusMasterApi;
export type LeadSourceOption = LeadSourceMasterApi;
export type WebsiteOption = WebsiteMasterApi;

const STORAGE_KEY = "mahasu-crm-state-v19";

function loadInitial(): State {
  return {
    leads: [],
    bookings: [],
    drivers: [],
    quotes: seedQuotes,
    itineraries: [],
    hotelTemplates: [],
    members: seedMembers,
    systemPermissions: seedSystemPermissions,
    adSpends: [],
    leadItineraries: {},
  };
}

function mergeLead(dtoLead: Lead, overlay?: LeadItineraryOverlay): Lead {
  return {
    ...dtoLead,
    // Prefer DB-backed template id over local overlay.
    itineraryTemplateId: dtoLead.itineraryTemplateId ?? overlay?.itineraryTemplateId,
    customItinerary: overlay?.customItinerary ?? dtoLead.customItinerary,
  };
}

type Ctx = {
  state: State;
  assignees: AssigneeOption[];
  leadStatuses: LeadStatusOption[];
  leadSources: LeadSourceOption[];
  websites: WebsiteOption[];
  leadsLoading: boolean;
  hotelsLoading: boolean;
  itinerariesLoading: boolean;
  driversLoading: boolean;
  adSpendsLoading: boolean;
  bookingsLoading: boolean;
  refreshLeads: () => Promise<void>;
  refreshHotels: () => Promise<void>;
  refreshItineraries: () => Promise<void>;
  refreshDrivers: () => Promise<void>;
  refreshAdSpends: () => Promise<void>;
  refreshBookings: () => Promise<void>;
  addLead: (l: LeadFormValues) => Promise<Lead>;
  updateLead: (
    id: string,
    patch: Partial<Omit<Lead, "itineraryTemplateId" | "vehicleId">> & {
      assignedToId?: string | null;
      itineraryTemplateId?: string | null;
      vehicleId?: string | null;
    }
  ) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addLeadComment: (leadId: string, text: string) => Promise<void>;
  loadLeadComments: (leadId: string) => Promise<void>;
  loadLeadActivity: (leadId: string) => Promise<void>;
  addBooking: (b: Omit<Booking, "id" | "bookingNo">) => Promise<Booking>;
  updateBooking: (
    id: string,
    patch: Partial<Omit<Booking, "hotel">> & { hotel?: Hotel | null }
  ) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  assignHotel: (bookingId: string, hotel: Hotel) => Promise<void>;
  removeHotel: (bookingId: string) => Promise<void>;
  addDriver: (d: Omit<Driver, "id" | "driverNo">) => Promise<Driver>;
  updateDriver: (id: string, patch: Partial<Driver>) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  addQuote: (q: Omit<Quote, "id">) => void;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  addItinerary: (t: Omit<ItineraryTemplate, "id" | "itineraryNo" | "updatedAt">) => Promise<ItineraryTemplate>;
  updateItinerary: (id: string, patch: Partial<ItineraryTemplate>) => Promise<void>;
  deleteItinerary: (id: string) => Promise<void>;
  duplicateItinerary: (id: string) => Promise<ItineraryTemplate | null>;
  assignLeadItinerary: (leadId: string, templateId: string) => void;
  updateLeadCustomItinerary: (leadId: string, custom: LeadCustomItinerary) => void;
  resetLeadItinerary: (leadId: string) => void;
  addHotelTemplate: (t: Omit<HotelTemplate, "id" | "hotelNo" | "updatedAt">) => Promise<HotelTemplate>;
  updateHotelTemplate: (id: string, patch: Partial<HotelTemplate>) => Promise<void>;
  deleteHotelTemplate: (id: string) => Promise<void>;
  duplicateHotelTemplate: (id: string) => Promise<HotelTemplate | null>;
  addMember: (m: Omit<Member, "id">) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  addSystemPermission: (p: Omit<SystemPermission, "id">) => void;
  updateSystemPermission: (id: string, patch: Partial<SystemPermission>) => void;
  deleteSystemPermission: (id: string) => void;
  addAdSpend: (s: Omit<AdSpendEntry, "id" | "createdAt">) => Promise<AdSpendEntry>;
  updateAdSpend: (id: string, patch: Partial<AdSpendEntry>) => Promise<void>;
  deleteAdSpend: (id: string) => Promise<void>;
  resetDemoData: () => void;
};

const DataContext = React.createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(loadInitial);
  const [hydrated, setHydrated] = React.useState(false);
  const [assignees, setAssignees] = React.useState<AssigneeOption[]>([]);
  const [leadStatuses, setLeadStatuses] = React.useState<LeadStatusOption[]>([]);
  const [leadSources, setLeadSources] = React.useState<LeadSourceOption[]>([]);
  const [websites, setWebsites] = React.useState<WebsiteOption[]>([]);
  const [leadsLoading, setLeadsLoading] = React.useState(true);
  const [hotelsLoading, setHotelsLoading] = React.useState(true);
  const [itinerariesLoading, setItinerariesLoading] = React.useState(true);
  const [driversLoading, setDriversLoading] = React.useState(true);
  const [adSpendsLoading, setAdSpendsLoading] = React.useState(true);
  const [bookingsLoading, setBookingsLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        setState({
          ...loadInitial(),
          ...parsed,
          leads: [],
          hotelTemplates: [],
          itineraries: [],
          drivers: [],
          adSpends: [],
          bookings: [],
          members: (parsed.members?.length ? parsed.members : seedMembers).map((m) => ({
            ...m,
            password: m.password ?? "",
          })),
          systemPermissions: parsed.systemPermissions?.length
            ? parsed.systemPermissions
            : seedSystemPermissions,
          leadItineraries: parsed.leadItineraries ?? {},
        });
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      const {
        leads: _leads,
        hotelTemplates: _hotels,
        itineraries: _itineraries,
        drivers: _drivers,
        adSpends: _adSpends,
        bookings: _bookings,
        ...rest
      } = state;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {
      // storage full or unavailable — ignore
    }
  }, [state, hydrated]);

  const refreshLeads = React.useCallback(async () => {
    setLeadsLoading(true);
    try {
      const [rows, users, masters] = await Promise.all([
        fetchLeads().catch(() => null),
        fetchAssignees().catch(() => null),
        fetchLeadMasters().catch(() => null),
      ]);

      if (users) setAssignees(users);
      if (masters) {
        setLeadStatuses(masters.statuses);
        setLeadSources(masters.sources);
        setWebsites(masters.websites);
      }
      if (rows) {
        setState((s) => ({
          ...s,
          leads: rows.map((row) => leadFromApi(row, s.leadItineraries[row.id])),
        }));
      }
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void refreshLeads();
  }, [hydrated, refreshLeads]);

  const refreshHotels = React.useCallback(async () => {
    setHotelsLoading(true);
    try {
      const rows = await fetchHotels();
      setState((s) => ({
        ...s,
        hotelTemplates: rows.map(hotelFromApi),
      }));
    } catch {
      setState((s) => ({ ...s, hotelTemplates: [] }));
    } finally {
      setHotelsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void refreshHotels();
  }, [hydrated, refreshHotels]);

  const refreshItineraries = React.useCallback(async () => {
    setItinerariesLoading(true);
    try {
      const rows = await fetchItineraries();
      setState((s) => ({
        ...s,
        itineraries: rows.map(itineraryFromApi),
      }));
    } catch {
      setState((s) => ({ ...s, itineraries: [] }));
    } finally {
      setItinerariesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void refreshItineraries();
  }, [hydrated, refreshItineraries]);

  const refreshDrivers = React.useCallback(async () => {
    setDriversLoading(true);
    try {
      const { drivers } = await fetchDrivers();
      setState((s) => ({
        ...s,
        drivers: drivers.map(driverFromApi),
      }));
    } catch {
      setState((s) => ({ ...s, drivers: [] }));
    } finally {
      setDriversLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void refreshDrivers();
  }, [hydrated, refreshDrivers]);

  const refreshAdSpends = React.useCallback(async () => {
    setAdSpendsLoading(true);
    try {
      const rows = await fetchAdSpends();
      setState((s) => ({
        ...s,
        adSpends: rows.map(adSpendFromApi),
      }));
    } catch {
      setState((s) => ({ ...s, adSpends: [] }));
    } finally {
      setAdSpendsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void refreshAdSpends();
  }, [hydrated, refreshAdSpends]);

  const refreshBookings = React.useCallback(async () => {
    setBookingsLoading(true);
    try {
      const rows = await fetchBookings();
      setState((s) => ({
        ...s,
        bookings: rows.map(bookingFromApi),
      }));
    } catch {
      setState((s) => ({ ...s, bookings: [] }));
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void refreshBookings();
  }, [hydrated, refreshBookings]);

  const addBooking = React.useCallback(async (input: Omit<Booking, "id" | "bookingNo">) => {
    const created = await createBookingApi(bookingToWritePayload(input));
    const mapped = bookingFromApi(created);
    setState((s) => ({
      ...s,
      bookings: [mapped, ...s.bookings.filter((item) => item.id !== mapped.id)],
    }));
    return mapped;
  }, []);

  const updateBooking = React.useCallback(
    async (id: string, patch: Partial<Omit<Booking, "hotel" | "hotels">> & {
      hotel?: Hotel | null;
      hotels?: Hotel[] | null;
    }) => {
    const payload: Parameters<typeof updateBookingApi>[1] = {};
    if (patch.leadId !== undefined) payload.lead_id = patch.leadId;
    if (patch.customer !== undefined) payload.customer = patch.customer;
    if (patch.email !== undefined) payload.email = patch.email;
    if (patch.city !== undefined) payload.city = patch.city;
    if (patch.phone !== undefined) payload.phone = patch.phone ?? "";
    if (patch.source !== undefined) payload.source = patch.source;
    if (patch.website !== undefined) payload.website = patch.website ?? "";
    if (patch.tourPackage !== undefined) payload.tour_package = patch.tourPackage;
    if (patch.pickup !== undefined) payload.pickup = patch.pickup;
    if (patch.dropoff !== undefined) payload.dropoff = patch.dropoff;
    if (patch.travelDate !== undefined) payload.travel_date = patch.travelDate || null;
    if (patch.returnDate !== undefined) payload.return_date = patch.returnDate || null;
    if (patch.cabType !== undefined) payload.cab_type = patch.cabType;
    if (patch.adults !== undefined) payload.adults = patch.adults;
    if (patch.kids !== undefined) payload.kids = patch.kids;
    if (patch.days !== undefined) payload.days = patch.days;
    if (patch.tourPlan !== undefined) payload.tour_plan = patch.tourPlan;
    if (patch.agent !== undefined) payload.agent = patch.agent;
    if (patch.driver !== undefined) payload.driver = patch.driver;
    if (patch.vehicle !== undefined) payload.vehicle = patch.vehicle;
    if (patch.drivers !== undefined) payload.drivers = patch.drivers ?? [];
    if (patch.total !== undefined) payload.total = patch.total;
    if (patch.advance !== undefined) payload.advance = patch.advance;
    if (patch.balance !== undefined) payload.balance = patch.balance;
    if (patch.status !== undefined) payload.status = patch.status;
    if ("hotel" in patch) payload.hotel = patch.hotel ?? null;
    if (patch.hotels !== undefined) payload.hotels = patch.hotels ?? [];
    if (patch.comments !== undefined) payload.comments = patch.comments ?? [];
    if (patch.history !== undefined) payload.history = patch.history ?? [];

    if (Object.keys(payload).length === 0) return;

    const updated = await updateBookingApi(id, payload);
    const mapped = bookingFromApi(updated);
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((item) => (item.id === id ? mapped : item)),
    }));
  },
  []
  );

  const deleteBooking = React.useCallback(async (id: string) => {
    await deleteBookingApi(id);
    setState((s) => ({
      ...s,
      bookings: s.bookings.filter((item) => item.id !== id),
    }));
  }, []);

  const assignHotel = React.useCallback(
    async (bookingId: string, hotel: Hotel) => {
      const booking = state.bookings.find((x) => x.id === bookingId);
      if (!booking) return;
      const wasAssigned = Boolean(booking.hotel);
      await updateBooking(bookingId, {
        hotel,
        hotels: [hotel],
        history: [
          makeLeadHistoryEvent(
            "note",
            wasAssigned ? "Hotel stay updated" : "Hotel assigned",
            {
              detail: `${hotel.hotelName} · ${hotel.roomCount} room(s)${
                hotel.referenceNumber ? ` · ${hotel.referenceNumber}` : ""
              }`,
            }
          ),
          ...(booking.history ?? []),
        ],
      });
    },
    [state.bookings, updateBooking]
  );

  const removeHotel = React.useCallback(
    async (bookingId: string) => {
      const booking = state.bookings.find((x) => x.id === bookingId);
      if (!booking) return;
      const name = booking.hotel?.hotelName;
      await updateBooking(bookingId, {
        hotel: null,
        hotels: [],
        history: [
          makeLeadHistoryEvent("note", "Hotel removed", {
            detail: name
              ? `${name} detached from booking · optional stay cleared`
              : "Hotel detached from booking",
          }),
          ...(booking.history ?? []),
        ],
      });
    },
    [state.bookings, updateBooking]
  );

  const addAdSpend = React.useCallback(async (input: Omit<AdSpendEntry, "id" | "createdAt">) => {
    const created = await createAdSpendApi(adSpendToWritePayload(input));
    const mapped = adSpendFromApi(created);
    setState((s) => ({
      ...s,
      adSpends: [mapped, ...(s.adSpends || []).filter((item) => item.id !== mapped.id)],
    }));
    return mapped;
  }, []);

  const updateAdSpend = React.useCallback(async (id: string, patch: Partial<AdSpendEntry>) => {
    const payload: Parameters<typeof updateAdSpendApi>[1] = {};
    if (patch.platform !== undefined) payload.platform = patch.platform;
    if (patch.website !== undefined) payload.website = patch.website ?? "";
    if (patch.amount !== undefined) payload.amount = patch.amount;
    if (patch.date !== undefined) payload.spend_date = patch.date;
    if (patch.campaignName !== undefined) payload.campaign_name = patch.campaignName ?? "";
    if (patch.leadsGenerated !== undefined) payload.leads_generated = patch.leadsGenerated ?? 0;
    if (patch.notes !== undefined) payload.notes = patch.notes ?? "";

    if (Object.keys(payload).length === 0) return;

    const updated = await updateAdSpendApi(id, payload);
    const mapped = adSpendFromApi(updated);
    setState((s) => ({
      ...s,
      adSpends: (s.adSpends || []).map((item) => (item.id === id ? mapped : item)),
    }));
  }, []);

  const deleteAdSpend = React.useCallback(async (id: string) => {
    await deleteAdSpendApi(id);
    setState((s) => ({
      ...s,
      adSpends: (s.adSpends || []).filter((item) => item.id !== id),
    }));
  }, []);

  const addItinerary = React.useCallback(
    async (input: Omit<ItineraryTemplate, "id" | "itineraryNo" | "updatedAt">) => {
      const created = await createItineraryApi(itineraryToWritePayload(input));
      const mapped = itineraryFromApi(created);
      setState((s) => ({
        ...s,
        itineraries: [mapped, ...s.itineraries.filter((item) => item.id !== mapped.id)],
      }));
      return mapped;
    },
    []
  );

  const updateItinerary = React.useCallback(async (id: string, patch: Partial<ItineraryTemplate>) => {
    const payload: Parameters<typeof updateItineraryApi>[1] = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.slug !== undefined) payload.slug = patch.slug;
    if (patch.tourPackage !== undefined) payload.tour_package = patch.tourPackage;
    if (patch.subtitle !== undefined) payload.subtitle = patch.subtitle;
    if (patch.overview !== undefined) payload.overview = patch.overview;
    if (patch.inclusions !== undefined) payload.inclusions = patch.inclusions;
    if (patch.startingFrom !== undefined) payload.starting_from = patch.startingFrom;
    if (patch.discountPercentage !== undefined) {
      payload.discount_percentage = patch.discountPercentage;
    }
    if (patch.nights !== undefined) payload.nights = patch.nights;
    if (patch.days !== undefined) payload.days = patch.days;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.daysPlan !== undefined) {
      payload.days_plan = patch.daysPlan.map((d) => ({
        day: d.day,
        title: d.title,
        detail: d.detail ?? "",
        ...(d.hotelId ? { hotel_id: d.hotelId } : {}),
        ...(d.hotelName ? { hotel_name: d.hotelName } : {}),
      }));
    }

    if (Object.keys(payload).length === 0) return;

    const updated = await updateItineraryApi(id, payload);
    const mapped = itineraryFromApi(updated);
    setState((s) => ({
      ...s,
      itineraries: s.itineraries.map((item) => (item.id === id ? mapped : item)),
    }));
  }, []);

  const deleteItinerary = React.useCallback(async (id: string) => {
    await deleteItineraryApi(id);
    setState((s) => ({
      ...s,
      itineraries: s.itineraries.filter((item) => item.id !== id),
    }));
  }, []);

  const addDriver = React.useCallback(async (input: Omit<Driver, "id" | "driverNo">) => {
    const created = await createDriverApi(driverToWritePayload(input));
    const mapped = driverFromApi(created);
    setState((s) => ({
      ...s,
      drivers: [mapped, ...s.drivers.filter((item) => item.id !== mapped.id)],
    }));
    return mapped;
  }, []);

  const updateDriver = React.useCallback(async (id: string, patch: Partial<Driver>) => {
    const payload: Parameters<typeof updateDriverApi>[1] = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.phone !== undefined) payload.phone = patch.phone;
    if (patch.address !== undefined) payload.address = patch.address;
    if (patch.licenseNumber !== undefined) payload.license_number = patch.licenseNumber;
    if (patch.licenseExpiry !== undefined) payload.license_expiry = patch.licenseExpiry || null;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.rating !== undefined) payload.rating = patch.rating;
    if (patch.trips !== undefined) payload.trips = patch.trips;
    if (patch.vendor !== undefined) payload.vendor = patch.vendor;
    if (patch.documentsVerified !== undefined) {
      payload.documents_verified = patch.documentsVerified;
    }
    if (patch.notes !== undefined) payload.notes = patch.notes;
    if (patch.vehicle !== undefined) payload.vehicle = patch.vehicle;
    if (patch.vehicleType !== undefined) payload.vehicle_type = patch.vehicleType;
    if (patch.vehicleCapacity !== undefined) payload.vehicle_capacity = patch.vehicleCapacity;
    if (patch.fuelType !== undefined) payload.fuel_type = patch.fuelType ?? "";
    if (patch.rcNumber !== undefined) payload.rc_number = patch.rcNumber;
    if (patch.insuranceExpiry !== undefined) {
      payload.insurance_expiry = patch.insuranceExpiry || null;
    }
    if (patch.pollutionExpiry !== undefined) {
      payload.pollution_expiry = patch.pollutionExpiry || null;
    }

    if (Object.keys(payload).length === 0) return;

    const updated = await updateDriverApi(id, payload);
    const mapped = driverFromApi(updated);
    setState((s) => ({
      ...s,
      drivers: s.drivers.map((item) => (item.id === id ? mapped : item)),
    }));
  }, []);

  const deleteDriver = React.useCallback(async (id: string) => {
    await deleteDriverApi(id);
    setState((s) => ({
      ...s,
      drivers: s.drivers.filter((item) => item.id !== id),
    }));
  }, []);

  const duplicateItinerary = React.useCallback(
    async (id: string) => {
      const source = state.itineraries.find((x) => x.id === id);
      if (!source) return null;
      return addItinerary({
        name: `${source.name} (Copy)`,
        slug: `${slugify(source.slug || source.name)}-copy`,
        tourPackage: source.tourPackage,
        subtitle: source.subtitle,
        overview: source.overview,
        inclusions: [...source.inclusions],
        startingFrom: source.startingFrom,
        discountPercentage: source.discountPercentage,
        nights: source.nights,
        days: source.days,
        status: "Draft",
        daysPlan: source.daysPlan.map((d) => ({ ...d })),
      });
    },
    [addItinerary, state.itineraries]
  );

  const addLead = React.useCallback(async (input: LeadFormValues) => {
    const { lead } = await createLeadApi(leadToWritePayload(input));
    let mapped!: Lead;
    setState((s) => {
      mapped = mergeLead(leadFromApi(lead, s.leadItineraries[lead.id]), s.leadItineraries[lead.id]);
      return {
        ...s,
        leads: [mapped, ...s.leads.filter((item) => item.id !== lead.id)],
      };
    });
    return mapped;
  }, []);

  const updateLead = React.useCallback(async (
    id: string,
    patch: Partial<Omit<Lead, "itineraryTemplateId" | "vehicleId">> & {
      assignedToId?: string | null;
      itineraryTemplateId?: string | null;
      vehicleId?: string | null;
    }
  ) => {
    const itineraryOnly =
      (patch.itineraryTemplateId !== undefined || patch.customItinerary !== undefined) &&
      Object.keys(patch).every((key) =>
        ["itineraryTemplateId", "customItinerary", "history", "comments"].includes(key)
      );

    if (!itineraryOnly) {
      const payload: Partial<LeadWritePayload> = {};
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.phone !== undefined) payload.phone = patch.phone;
      if (patch.email !== undefined) payload.email = patch.email;
      if (patch.city !== undefined) payload.city = patch.city;
      if (patch.source !== undefined) payload.source = patch.source;
      if (patch.website !== undefined) payload.website = patch.website || null;
      if (patch.tourPackage !== undefined) payload.tour_package = patch.tourPackage;
      if (patch.itineraryTemplateId !== undefined) {
        payload.itinerary_template_id = patch.itineraryTemplateId || null;
      }
      if (patch.vehicleId !== undefined) payload.vehicle_id = patch.vehicleId || null;
      if (patch.car !== undefined) payload.car = patch.car;
      if (patch.pickup !== undefined) payload.pickup = patch.pickup;
      if (patch.drop !== undefined) payload.drop = patch.drop;
      if (patch.pickupDate !== undefined) payload.pickup_date = patch.pickupDate;
      if (patch.dropDate !== undefined) payload.drop_date = patch.dropDate;
      if (patch.nextFollowUpDate !== undefined) payload.next_follow_up_date = patch.nextFollowUpDate || null;
      if (patch.nextFollowUpTime !== undefined) payload.next_follow_up_time = patch.nextFollowUpTime || null;
      if (patch.adults !== undefined) payload.adults = patch.adults;
      if (patch.kids !== undefined) payload.kids = patch.kids;
      if (patch.days !== undefined) payload.days = patch.days;
      if (patch.notes !== undefined) payload.notes = patch.notes;
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.price !== undefined) payload.price = patch.price;
      if (patch.assignedToId !== undefined) payload.assigned_to = patch.assignedToId;
      else if (patch.assignedTo !== undefined) payload.assigned_to = patch.assignedTo?.id ?? null;

      if (Object.keys(payload).length > 0) {
        const updated = await updateLeadApi(id, payload);
        setState((s) => ({
          ...s,
          leads: s.leads.map((item) =>
            item.id === id ? mergeLead(leadFromApi(updated, s.leadItineraries[id]), s.leadItineraries[id]) : item
          ),
        }));
      }
    }

    if (patch.itineraryTemplateId !== undefined || patch.customItinerary !== undefined) {
      setState((s) => {
        const overlay: LeadItineraryOverlay = {
          ...s.leadItineraries[id],
          ...(patch.itineraryTemplateId !== undefined
            ? { itineraryTemplateId: patch.itineraryTemplateId || undefined }
            : {}),
          ...(patch.customItinerary !== undefined ? { customItinerary: patch.customItinerary } : {}),
        };
        return {
          ...s,
          leadItineraries: { ...s.leadItineraries, [id]: overlay },
          leads: s.leads.map((item) => (item.id === id ? mergeLead(item, overlay) : item)),
        };
      });
    }
  }, []);

  const deleteLead = React.useCallback(async (id: string) => {
    await deleteLeadApi(id);
    setState((s) => {
      const { [id]: _removed, ...rest } = s.leadItineraries;
      return {
        ...s,
        leads: s.leads.filter((x) => x.id !== id),
        leadItineraries: rest,
      };
    });
  }, []);

  const addLeadComment = React.useCallback(async (leadId: string, text: string) => {
    const comment = await createLeadCommentApi(leadId, text);
    setState((s) => ({
      ...s,
      leads: s.leads.map((lead) =>
        lead.id === leadId
          ? { ...lead, comments: [commentFromApi(comment), ...(lead.comments ?? [])] }
          : lead
      ),
    }));
  }, []);

  const loadLeadComments = React.useCallback(async (leadId: string) => {
    const comments = await fetchLeadComments(leadId);
    setState((s) => ({
      ...s,
      leads: s.leads.map((lead) =>
        lead.id === leadId ? { ...lead, comments: comments.map(commentFromApi) } : lead
      ),
    }));
  }, []);

  const loadLeadActivity = React.useCallback(async (leadId: string) => {
    const activity = await fetchLeadActivity(leadId);
    setState((s) => ({
      ...s,
      leads: s.leads.map((lead) =>
        lead.id === leadId ? { ...lead, history: activity.map(activityFromApi) } : lead
      ),
    }));
  }, []);

  const addHotelTemplate = React.useCallback(
    async (input: Omit<HotelTemplate, "id" | "hotelNo" | "updatedAt">) => {
      const created = await createHotelApi(hotelToWritePayload(input));
      const mapped = hotelFromApi(created);
      setState((s) => ({
        ...s,
        hotelTemplates: [mapped, ...s.hotelTemplates.filter((item) => item.id !== mapped.id)],
      }));
      return mapped;
    },
    []
  );

  const updateHotelTemplate = React.useCallback(async (id: string, patch: Partial<HotelTemplate>) => {
    const payload: Parameters<typeof updateHotelApi>[1] = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.city !== undefined) payload.city = patch.city;
    if (patch.address !== undefined) payload.address = patch.address;
    if (patch.contactNumber !== undefined) payload.contact_number = patch.contactNumber;
    if (patch.defaultRoomType !== undefined) payload.default_room_type = patch.defaultRoomType;
    if (patch.typicalRate !== undefined) payload.typical_rate = patch.typicalRate;
    if (patch.notes !== undefined) payload.notes = patch.notes;
    if (patch.status !== undefined) payload.status = patch.status;

    if (Object.keys(payload).length === 0) return;

    const updated = await updateHotelApi(id, payload);
    const mapped = hotelFromApi(updated);
    setState((s) => ({
      ...s,
      hotelTemplates: s.hotelTemplates.map((item) => (item.id === id ? mapped : item)),
    }));
  }, []);

  const deleteHotelTemplate = React.useCallback(async (id: string) => {
    await deleteHotelApi(id);
    setState((s) => ({
      ...s,
      hotelTemplates: s.hotelTemplates.filter((item) => item.id !== id),
    }));
  }, []);

  const duplicateHotelTemplate = React.useCallback(async (id: string) => {
    const source = state.hotelTemplates.find((x) => x.id === id);
    if (!source) return null;
    return addHotelTemplate({
      name: `${source.name} (Copy)`,
      city: source.city,
      address: source.address,
      contactNumber: source.contactNumber,
      defaultRoomType: source.defaultRoomType,
      typicalRate: source.typicalRate,
      notes: source.notes,
      status: "Draft",
    });
  }, [addHotelTemplate, state.hotelTemplates]);

  const value = React.useMemo<Ctx>(
    () => ({
      state,
      assignees,
      leadStatuses,
      leadSources,
      websites,
      leadsLoading,
      hotelsLoading,
      itinerariesLoading,
      driversLoading,
      adSpendsLoading,
      bookingsLoading,
      refreshLeads,
      refreshHotels,
      refreshItineraries,
      refreshDrivers,
      refreshAdSpends,
      refreshBookings,
      addLead,
      updateLead,
      deleteLead,
      addLeadComment,
      loadLeadComments,
      loadLeadActivity,

      addBooking,
      updateBooking,
      deleteBooking,
      assignHotel,
      removeHotel,

      addDriver,
      updateDriver,
      deleteDriver,

      addQuote: (q) => setState((s) => ({ ...s, quotes: [{ ...q, id: genId("QT") }, ...s.quotes] })),
      updateQuote: (id, patch) =>
        setState((s) => ({ ...s, quotes: s.quotes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteQuote: (id) => setState((s) => ({ ...s, quotes: s.quotes.filter((x) => x.id !== id) })),

      addItinerary,
      updateItinerary,
      deleteItinerary,
      duplicateItinerary,

      assignLeadItinerary: (leadId, templateId) =>
        setState((s) => {
          const template = s.itineraries.find((t) => t.id === templateId);
          const overlay: LeadItineraryOverlay = {
            itineraryTemplateId: templateId,
            customItinerary: undefined,
          };
          return {
            ...s,
            leadItineraries: { ...s.leadItineraries, [leadId]: overlay },
            leads: s.leads.map((lead) => {
              if (lead.id !== leadId) return lead;
              return {
                ...mergeLead(lead, overlay),
                history: [
                  makeLeadHistoryEvent("updated", "Itinerary template assigned", {
                    detail: template ? `${template.name} · master template` : templateId,
                  }),
                  ...(lead.history ?? []),
                ],
              };
            }),
          };
        }),

      updateLeadCustomItinerary: (leadId, custom) =>
        setState((s) => {
          const overlay: LeadItineraryOverlay = {
            ...s.leadItineraries[leadId],
            itineraryTemplateId: custom.templateId || s.leadItineraries[leadId]?.itineraryTemplateId,
            customItinerary: custom,
          };
          return {
            ...s,
            leadItineraries: { ...s.leadItineraries, [leadId]: overlay },
            leads: s.leads.map((lead) => {
              if (lead.id !== leadId) return lead;
              return {
                ...mergeLead(lead, overlay),
                history: [
                  makeLeadHistoryEvent("updated", "Itinerary customized for guest", {
                    detail: `${custom.title} · original template unchanged`,
                  }),
                  ...(lead.history ?? []),
                ],
              };
            }),
          };
        }),

      resetLeadItinerary: (leadId) =>
        setState((s) => {
          const overlay: LeadItineraryOverlay = {
            itineraryTemplateId: s.leadItineraries[leadId]?.itineraryTemplateId,
            customItinerary: undefined,
          };
          return {
            ...s,
            leadItineraries: { ...s.leadItineraries, [leadId]: overlay },
            leads: s.leads.map((lead) => {
              if (lead.id !== leadId) return lead;
              return {
                ...mergeLead(lead, overlay),
                history: [
                  makeLeadHistoryEvent("updated", "Itinerary reset to template", {
                    detail: "Guest copy cleared · master template restored",
                  }),
                  ...(lead.history ?? []),
                ],
              };
            }),
          };
        }),

      addHotelTemplate,
      updateHotelTemplate,
      deleteHotelTemplate,
      duplicateHotelTemplate,

      addMember: (m) =>
        setState((s) => ({ ...s, members: [{ ...m, id: genId("MB") }, ...s.members] })),
      updateMember: (id, patch) =>
        setState((s) => ({
          ...s,
          members: s.members.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteMember: (id) =>
        setState((s) => ({ ...s, members: s.members.filter((x) => x.id !== id) })),

      addSystemPermission: (p) =>
        setState((s) => ({
          ...s,
          systemPermissions: [{ ...p, id: genId("SP") }, ...s.systemPermissions],
        })),
      updateSystemPermission: (id, patch) =>
        setState((s) => ({
          ...s,
          systemPermissions: s.systemPermissions.map((x) =>
            x.id === id ? { ...x, ...patch } : x
          ),
        })),
      deleteSystemPermission: (id) =>
        setState((s) => ({
          ...s,
          systemPermissions: s.systemPermissions.filter((x) => x.id !== id),
        })),

      addAdSpend,
      updateAdSpend,
      deleteAdSpend,

      resetDemoData: () => setState(loadInitial()),
    }),
    [
      state,
      assignees,
      leadStatuses,
      leadSources,
      websites,
      leadsLoading,
      hotelsLoading,
      itinerariesLoading,
      driversLoading,
      adSpendsLoading,
      bookingsLoading,
      refreshLeads,
      refreshHotels,
      refreshItineraries,
      refreshDrivers,
      refreshAdSpends,
      refreshBookings,
      addLead,
      updateLead,
      deleteLead,
      addLeadComment,
      loadLeadComments,
      loadLeadActivity,
      addHotelTemplate,
      updateHotelTemplate,
      deleteHotelTemplate,
      duplicateHotelTemplate,
      addItinerary,
      updateItinerary,
      deleteItinerary,
      duplicateItinerary,
      addDriver,
      updateDriver,
      deleteDriver,
      addAdSpend,
      updateAdSpend,
      deleteAdSpend,
      addBooking,
      updateBooking,
      deleteBooking,
      assignHotel,
      removeHotel,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
