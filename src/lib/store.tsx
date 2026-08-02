"use client";

import * as React from "react";
import {
  Lead,
  Booking,
  Driver,
  Quote,
  Hotel,
  AutomationRule,
  leads as seedLeads,
  bookings as seedBookings,
  drivers as seedDrivers,
  quotes as seedQuotes,
  automationRules as seedRules,
  genId,
} from "@/lib/data";

type State = {
  leads: Lead[];
  bookings: Booking[];
  drivers: Driver[];
  quotes: Quote[];
  rules: AutomationRule[];
};

const STORAGE_KEY = "mahasu-crm-state-v11";

function loadInitial(): State {
  return { leads: seedLeads, bookings: seedBookings, drivers: seedDrivers, quotes: seedQuotes, rules: seedRules };
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
  toggleRule: (id: string) => void;
  resetDemoData: () => void;
};

const DataContext = React.createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(loadInitial);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
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
          bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, hotel } : x)),
        })),
      removeHotel: (bookingId) =>
        setState((s) => ({
          ...s,
          bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, hotel: undefined } : x)),
        })),

      addDriver: (d) => setState((s) => ({ ...s, drivers: [{ ...d, id: genId("DR") }, ...s.drivers] })),
      updateDriver: (id, patch) =>
        setState((s) => ({ ...s, drivers: s.drivers.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteDriver: (id) => setState((s) => ({ ...s, drivers: s.drivers.filter((x) => x.id !== id) })),

      addQuote: (q) => setState((s) => ({ ...s, quotes: [{ ...q, id: genId("QT") }, ...s.quotes] })),
      updateQuote: (id, patch) =>
        setState((s) => ({ ...s, quotes: s.quotes.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteQuote: (id) => setState((s) => ({ ...s, quotes: s.quotes.filter((x) => x.id !== id) })),

      toggleRule: (id) =>
        setState((s) => ({
          ...s,
          rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
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
