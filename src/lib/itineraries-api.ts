import type { ItineraryDay, ItineraryTemplate, ItineraryStatus } from "@/lib/data";
import { formatRelativeTime } from "@/lib/lead-utils";
import { suggestDurationFromPlan } from "@/lib/itinerary-utils";

export type ItineraryDayApi = {
  day: number;
  title: string;
  detail: string;
  hotel_id?: string;
  hotel_name?: string;
};

export type ItineraryApi = {
  id: string;
  itinerary_no: string;
  name: string;
  slug: string;
  tour_package: string;
  subtitle: string;
  overview: string;
  inclusions: string[];
  starting_from: number;
  discount_percentage: number;
  nights: string;
  days: string;
  status: ItineraryStatus;
  days_plan: ItineraryDayApi[];
  created_at: string;
  updated_at: string;
};

export type ItineraryWritePayload = {
  name: string;
  slug?: string;
  tour_package: string;
  subtitle?: string;
  overview?: string;
  inclusions?: string[];
  starting_from?: number;
  discount_percentage?: number;
  nights?: string;
  days?: string;
  status?: ItineraryStatus;
  days_plan: ItineraryDayApi[];
};

export function itineraryFromApi(dto: ItineraryApi): ItineraryTemplate {
  return {
    id: dto.id,
    itineraryNo: dto.itinerary_no,
    name: dto.name,
    slug: dto.slug,
    tourPackage: dto.tour_package,
    subtitle: dto.subtitle ?? "",
    overview: dto.overview ?? "",
    inclusions: Array.isArray(dto.inclusions) ? dto.inclusions : [],
    startingFrom: dto.starting_from ?? 0,
    discountPercentage: dto.discount_percentage ?? 0,
    nights: dto.nights ?? "",
    days: dto.days ?? "",
    status: dto.status,
    daysPlan: (dto.days_plan ?? []).map((d) => ({
      day: d.day,
      title: d.title,
      detail: d.detail ?? "",
      ...(d.hotel_id ? { hotelId: d.hotel_id } : {}),
      ...(d.hotel_name ? { hotelName: d.hotel_name } : {}),
    })),
    updatedAt: formatRelativeTime(dto.updated_at) || dto.updated_at,
  };
}

export function itineraryToWritePayload(
  input: Omit<ItineraryTemplate, "id" | "itineraryNo" | "updatedAt"> | {
    name: string;
    slug?: string;
    tourPackage: string;
    subtitle?: string;
    overview?: string;
    inclusions?: string[];
    startingFrom?: number;
    discountPercentage?: number;
    nights?: string;
    days?: string;
    status?: ItineraryStatus;
    daysPlan: ItineraryDay[];
  }
): ItineraryWritePayload {
  const daysPlan = input.daysPlan ?? [];
  const suggested = suggestDurationFromPlan(daysPlan);
  return {
    name: input.name,
    slug: input.slug || undefined,
    tour_package: input.tourPackage,
    subtitle: input.subtitle ?? "",
    overview: input.overview ?? "",
    inclusions: input.inclusions ?? [],
    starting_from: input.startingFrom ?? 0,
    discount_percentage: input.discountPercentage ?? 0,
    nights: input.nights || suggested.nights,
    days: input.days || suggested.days,
    status: input.status,
    days_plan: daysPlan.map((d) => ({
      day: d.day,
      title: d.title,
      detail: d.detail ?? "",
      ...(d.hotelId ? { hotel_id: d.hotelId } : {}),
      ...(d.hotelName ? { hotel_name: d.hotelName } : {}),
    })),
  };
}

export async function fetchItineraries(): Promise<ItineraryApi[]> {
  const res = await fetch("/api/itineraries", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load itineraries");
  const data = (await res.json()) as { itineraries?: ItineraryApi[] };
  return data.itineraries ?? [];
}

export async function createItineraryApi(payload: ItineraryWritePayload): Promise<ItineraryApi> {
  const res = await fetch("/api/itineraries", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to create itinerary");
  }
  const data = (await res.json()) as { itinerary: ItineraryApi };
  return data.itinerary;
}

export async function updateItineraryApi(
  id: string,
  payload: Partial<ItineraryWritePayload>
): Promise<ItineraryApi> {
  const res = await fetch(`/api/itineraries/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update itinerary");
  }
  const data = (await res.json()) as { itinerary: ItineraryApi };
  return data.itinerary;
}

export async function deleteItineraryApi(id: string): Promise<void> {
  const res = await fetch(`/api/itineraries/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to delete itinerary");
  }
}

export type ItineraryPackageApi = {
  id: string;
  name: string;
};

export async function fetchActiveItineraryPackages(): Promise<ItineraryPackageApi[]> {
  const res = await fetch("/api/itineraries/packages", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load tour packages");
  const data = (await res.json()) as { packages?: ItineraryPackageApi[] };
  return data.packages ?? [];
}
