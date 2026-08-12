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
  bookings as seedBookings,
  quotes as seedQuotes,
  members as seedMembers,
  systemPermissions as seedSystemPermissions,
  adSpends as seedAdSpends,
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
    bookings: seedBookings,
    drivers: [],
    quotes: seedQuotes,
    itineraries: [],
    hotelTemplates: [],
    members: seedMembers,
    systemPermissions: seedSystemPermissions,
    adSpends: seedAdSpends,
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
  refreshLeads: () => Promise<void>;
  refreshHotels: () => Promise<void>;
  refreshItineraries: () => Promise<void>;
  refreshDrivers: () => Promise<void>;
  addLead: (l: LeadFormValues) => Promise<Lead>;
  updateLead: (
    id: string,
    patch: Partial<Omit<Lead, "itineraryTemplateId">> & {
      assignedToId?: string | null;
      itineraryTemplateId?: string | null;
    }
  ) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addLeadComment: (leadId: string, text: string) => Promise<void>;
  loadLeadComments: (leadId: string) => Promise<void>;
  loadLeadActivity: (leadId: string) => Promise<void>;
  addBooking: (b: Omit<Booking, "id">) => void;
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  assignHotel: (bookingId: string, hotel: Hotel) => void;
  removeHotel: (bookingId: string) => void;
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
  addAdSpend: (s: Omit<AdSpendEntry, "id" | "createdAt">) => void;
  updateAdSpend: (id: string, patch: Partial<AdSpendEntry>) => void;
  deleteAdSpend: (id: string) => void;
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
          members: (parsed.members?.length ? parsed.members : seedMembers).map((m) => ({
            ...m,
            password: m.password ?? "",
          })),
          systemPermissions: parsed.systemPermissions?.length
            ? parsed.systemPermissions
            : seedSystemPermissions,
          adSpends: parsed.adSpends?.length ? parsed.adSpends : seedAdSpends,
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
    patch: Partial<Omit<Lead, "itineraryTemplateId">> & {
      assignedToId?: string | null;
      itineraryTemplateId?: string | null;
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
      if (patch.pickup !== undefined) payload.pickup = patch.pickup;
      if (patch.drop !== undefined) payload.drop = patch.drop;
      if (patch.pickupDate !== undefined) payload.pickup_date = patch.pickupDate;
      if (patch.dropDate !== undefined) payload.drop_date = patch.dropDate;
      if (patch.nextFollowUpDate !== undefined) payload.next_follow_up_date = patch.nextFollowUpDate || null;
      if (patch.nextFollowUpTime !== undefined) payload.next_follow_up_time = patch.nextFollowUpTime || null;
      if (patch.car !== undefined) payload.car = patch.car;
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
      refreshLeads,
      refreshHotels,
      refreshItineraries,
      refreshDrivers,
      addLead,
      updateLead,
      deleteLead,
      addLeadComment,
      loadLeadComments,
      loadLeadActivity,

      addBooking: (b) => setState((s) => ({ ...s, bookings: [{ ...b, id: genId("BK") }, ...s.bookings] })),
      updateBooking: (id, patch) =>
        setState((s) => ({ ...s, bookings: s.bookings.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteBooking: (id) => setState((s) => ({ ...s, bookings: s.bookings.filter((x) => x.id !== id) })),
      assignHotel: (bookingId, hotel) =>
        setState((s) => ({
          ...s,
          bookings: s.bookings.map((x) => {
            if (x.id !== bookingId) return x;
            const wasAssigned = Boolean(x.hotel);
            return {
              ...x,
              hotel,
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
                ...(x.history ?? []),
              ],
            };
          }),
        })),
      removeHotel: (bookingId) =>
        setState((s) => ({
          ...s,
          bookings: s.bookings.map((x) => {
            if (x.id !== bookingId) return x;
            const name = x.hotel?.hotelName;
            return {
              ...x,
              hotel: undefined,
              history: [
                makeLeadHistoryEvent("note", "Hotel removed", {
                  detail: name
                    ? `${name} detached from booking · optional stay cleared`
                    : "Hotel detached from booking",
                }),
                ...(x.history ?? []),
              ],
            };
          }),
        })),

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

      addAdSpend: (spend) =>
        setState((s) => ({
          ...s,
          adSpends: [
            {
              ...spend,
              id: genId("SP"),
              createdAt: new Date().toISOString().split("T")[0],
            },
            ...(s.adSpends || []),
          ],
        })),
      updateAdSpend: (id, patch) =>
        setState((s) => ({
          ...s,
          adSpends: (s.adSpends || []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteAdSpend: (id) =>
        setState((s) => ({
          ...s,
          adSpends: (s.adSpends || []).filter((x) => x.id !== id),
        })),

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
      refreshLeads,
      refreshHotels,
      refreshItineraries,
      refreshDrivers,
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
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
