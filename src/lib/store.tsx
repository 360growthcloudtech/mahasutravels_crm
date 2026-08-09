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
  drivers as seedDrivers,
  quotes as seedQuotes,
  itineraries as seedItineraries,
  hotelTemplates as seedHotelTemplates,
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

export type LeadFormValues = {
  name: string;
  email: string;
  city: string;
  phone: string;
  source: string;
  website?: string;
  tourPackage: string;
  pickup: string;
  drop: string;
  pickupDate: string;
  dropDate: string;
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
    drivers: seedDrivers,
    quotes: seedQuotes,
    itineraries: seedItineraries,
    hotelTemplates: seedHotelTemplates,
    members: seedMembers,
    systemPermissions: seedSystemPermissions,
    adSpends: seedAdSpends,
    leadItineraries: {},
  };
}

function mergeLead(dtoLead: Lead, overlay?: LeadItineraryOverlay): Lead {
  return {
    ...dtoLead,
    itineraryTemplateId: overlay?.itineraryTemplateId ?? dtoLead.itineraryTemplateId,
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
  refreshLeads: () => Promise<void>;
  addLead: (l: LeadFormValues) => Promise<Lead>;
  updateLead: (id: string, patch: Partial<Lead> & { assignedToId?: string | null }) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addLeadComment: (leadId: string, text: string) => Promise<void>;
  loadLeadComments: (leadId: string) => Promise<void>;
  loadLeadActivity: (leadId: string) => Promise<void>;
  addBooking: (b: Omit<Booking, "id">) => void;
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  assignHotel: (bookingId: string, hotel: Hotel) => void;
  removeHotel: (bookingId: string) => void;
  addDriver: (d: Omit<Driver, "id">) => void;
  updateDriver: (id: string, patch: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addQuote: (q: Omit<Quote, "id">) => void;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  addItinerary: (t: Omit<ItineraryTemplate, "id" | "updatedAt">) => void;
  updateItinerary: (id: string, patch: Partial<ItineraryTemplate>) => void;
  deleteItinerary: (id: string) => void;
  duplicateItinerary: (id: string) => void;
  assignLeadItinerary: (leadId: string, templateId: string) => void;
  updateLeadCustomItinerary: (leadId: string, custom: LeadCustomItinerary) => void;
  resetLeadItinerary: (leadId: string) => void;
  addHotelTemplate: (t: Omit<HotelTemplate, "id" | "updatedAt">) => void;
  updateHotelTemplate: (id: string, patch: Partial<HotelTemplate>) => void;
  deleteHotelTemplate: (id: string) => void;
  duplicateHotelTemplate: (id: string) => void;
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

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        setState({
          ...loadInitial(),
          ...parsed,
          leads: [],
          itineraries: parsed.itineraries?.length ? parsed.itineraries : seedItineraries,
          hotelTemplates: parsed.hotelTemplates?.length
            ? parsed.hotelTemplates
            : seedHotelTemplates,
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
      const { leads: _leads, ...rest } = state;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {
      // storage full or unavailable — ignore
    }
  }, [state, hydrated]);

  const refreshLeads = React.useCallback(async () => {
    setLeadsLoading(true);
    try {
      const [rows, users, masters] = await Promise.all([
        fetchLeads(),
        fetchAssignees().catch(() => []),
        fetchLeadMasters().catch(() => ({ statuses: [], sources: [], websites: [] })),
      ]);
      setAssignees(users);
      setLeadStatuses(masters.statuses);
      setLeadSources(masters.sources);
      setWebsites(masters.websites);
      setState((s) => ({
        ...s,
        leads: rows.map((row) => leadFromApi(row, s.leadItineraries[row.id])),
      }));
    } catch {
      setAssignees([]);
      setLeadStatuses([]);
      setLeadSources([]);
      setWebsites([]);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    void refreshLeads();
  }, [hydrated, refreshLeads]);

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

  const updateLead = React.useCallback(async (id: string, patch: Partial<Lead> & { assignedToId?: string | null }) => {
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
      if (patch.pickup !== undefined) payload.pickup = patch.pickup;
      if (patch.drop !== undefined) payload.drop = patch.drop;
      if (patch.pickupDate !== undefined) payload.pickup_date = patch.pickupDate;
      if (patch.dropDate !== undefined) payload.drop_date = patch.dropDate;
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
            ? { itineraryTemplateId: patch.itineraryTemplateId }
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

  const value = React.useMemo<Ctx>(
    () => ({
      state,
      assignees,
      leadStatuses,
      leadSources,
      websites,
      leadsLoading,
      refreshLeads,
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

      addDriver: (d) => setState((s) => ({ ...s, drivers: [{ ...d, id: genId("DR") }, ...s.drivers] })),
      updateDriver: (id, patch) =>
        setState((s) => ({ ...s, drivers: s.drivers.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteDriver: (id) => setState((s) => ({ ...s, drivers: s.drivers.filter((x) => x.id !== id) })),

      addQuote: (q) => setState((s) => ({ ...s, quotes: [{ ...q, id: genId("QT") }, ...s.quotes] })),
      updateQuote: (id, patch) =>
        setState((s) => ({ ...s, quotes: s.quotes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteQuote: (id) => setState((s) => ({ ...s, quotes: s.quotes.filter((x) => x.id !== id) })),

      addItinerary: (t) =>
        setState((s) => ({
          ...s,
          itineraries: [{ ...t, id: genId("IT"), updatedAt: "Just now" }, ...s.itineraries],
        })),
      updateItinerary: (id, patch) =>
        setState((s) => ({
          ...s,
          itineraries: s.itineraries.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: "Just now" } : x
          ),
        })),
      deleteItinerary: (id) =>
        setState((s) => ({ ...s, itineraries: s.itineraries.filter((x) => x.id !== id) })),
      duplicateItinerary: (id) =>
        setState((s) => {
          const source = s.itineraries.find((x) => x.id === id);
          if (!source) return s;
          const copy: ItineraryTemplate = {
            ...source,
            id: genId("IT"),
            name: `${source.name} (Copy)`,
            status: "Draft",
            updatedAt: "Just now",
            inclusions: [...source.inclusions],
            daysPlan: source.daysPlan.map((d) => ({ ...d })),
          };
          return { ...s, itineraries: [copy, ...s.itineraries] };
        }),

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

      addHotelTemplate: (t) =>
        setState((s) => ({
          ...s,
          hotelTemplates: [{ ...t, id: genId("HT"), updatedAt: "Just now" }, ...s.hotelTemplates],
        })),
      updateHotelTemplate: (id, patch) =>
        setState((s) => ({
          ...s,
          hotelTemplates: s.hotelTemplates.map((x) =>
            x.id === id ? { ...x, ...patch, updatedAt: "Just now" } : x
          ),
        })),
      deleteHotelTemplate: (id) =>
        setState((s) => ({
          ...s,
          hotelTemplates: s.hotelTemplates.filter((x) => x.id !== id),
        })),
      duplicateHotelTemplate: (id) =>
        setState((s) => {
          const source = s.hotelTemplates.find((x) => x.id === id);
          if (!source) return s;
          const copy: HotelTemplate = {
            ...source,
            id: genId("HT"),
            name: `${source.name} (Copy)`,
            status: "Draft",
            updatedAt: "Just now",
          };
          return { ...s, hotelTemplates: [copy, ...s.hotelTemplates] };
        }),

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
      refreshLeads,
      addLead,
      updateLead,
      deleteLead,
      addLeadComment,
      loadLeadComments,
      loadLeadActivity,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
