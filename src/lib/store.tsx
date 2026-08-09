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
  leads as seedLeads,
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
};

const STORAGE_KEY = "mahasu-crm-state-v18";

function loadInitial(): State {
  return {
    leads: seedLeads,
    bookings: seedBookings,
    drivers: seedDrivers,
    quotes: seedQuotes,
    itineraries: seedItineraries,
    hotelTemplates: seedHotelTemplates,
    members: seedMembers,
    systemPermissions: seedSystemPermissions,
    adSpends: seedAdSpends,
  };
}

type Ctx = {
  state: State;
  addLead: (l: Omit<Lead, "id">) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
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

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        setState({
          ...loadInitial(),
          ...parsed,
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — ignore
    }
  }, [state, hydrated]);

  const value = React.useMemo<Ctx>(
    () => ({
      state,
      addLead: (l) => setState((s) => ({ ...s, leads: [{ ...l, id: genId("LD") }, ...s.leads] })),
      updateLead: (id, patch) =>
        setState((s) => ({ ...s, leads: s.leads.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteLead: (id) => setState((s) => ({ ...s, leads: s.leads.filter((x) => x.id !== id) })),

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
        setState((s) => ({
          ...s,
          leads: s.leads.map((lead) => {
            if (lead.id !== leadId) return lead;
            const template = s.itineraries.find((t) => t.id === templateId);
            return {
              ...lead,
              itineraryTemplateId: templateId,
              customItinerary: undefined,
              lastActivity: "Just now",
              history: [
                makeLeadHistoryEvent("updated", "Itinerary template assigned", {
                  detail: template ? `${template.name} · master template` : templateId,
                }),
                ...(lead.history ?? []),
              ],
            };
          }),
        })),

      updateLeadCustomItinerary: (leadId, custom) =>
        setState((s) => ({
          ...s,
          leads: s.leads.map((lead) => {
            if (lead.id !== leadId) return lead;
            return {
              ...lead,
              itineraryTemplateId: custom.templateId || lead.itineraryTemplateId,
              customItinerary: custom,
              lastActivity: "Just now",
              history: [
                makeLeadHistoryEvent("updated", "Itinerary customized for guest", {
                  detail: `${custom.title} · original template unchanged`,
                }),
                ...(lead.history ?? []),
              ],
            };
          }),
        })),

      resetLeadItinerary: (leadId) =>
        setState((s) => ({
          ...s,
          leads: s.leads.map((lead) => {
            if (lead.id !== leadId) return lead;
            return {
              ...lead,
              customItinerary: undefined,
              lastActivity: "Just now",
              history: [
                makeLeadHistoryEvent("updated", "Itinerary reset to template", {
                  detail: "Guest copy cleared · master template restored",
                }),
                ...(lead.history ?? []),
              ],
            };
          }),
        })),

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
    [state]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
