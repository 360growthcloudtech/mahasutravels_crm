import type { HotelTemplate, HotelTemplateStatus } from "@/lib/data";
import { formatRelativeTime } from "@/lib/lead-utils";

export type HotelApi = {
  id: string;
  hotel_no: string;
  name: string;
  city: string;
  address: string;
  contact_number: string;
  default_room_type: string;
  typical_rate: number;
  notes: string;
  status: HotelTemplateStatus;
  created_at: string;
  updated_at: string;
};

export type HotelWritePayload = {
  name: string;
  city: string;
  address?: string;
  contact_number?: string;
  default_room_type?: string;
  typical_rate?: number;
  notes?: string;
  status?: HotelTemplateStatus;
};

export function hotelFromApi(dto: HotelApi): HotelTemplate {
  return {
    id: dto.id,
    hotelNo: dto.hotel_no,
    name: dto.name,
    city: dto.city,
    address: dto.address ?? "",
    contactNumber: dto.contact_number ?? "",
    defaultRoomType: dto.default_room_type ?? "",
    typicalRate: dto.typical_rate ?? 0,
    notes: dto.notes ?? "",
    status: dto.status,
    updatedAt: formatRelativeTime(dto.updated_at) || dto.updated_at,
  };
}

export function hotelToWritePayload(
  input: Omit<HotelTemplate, "id" | "hotelNo" | "updatedAt"> | {
    name: string;
    city: string;
    address?: string;
    contactNumber?: string;
    defaultRoomType?: string;
    typicalRate?: number;
    notes?: string;
    status?: HotelTemplateStatus;
  }
): HotelWritePayload {
  return {
    name: input.name,
    city: input.city,
    address: input.address ?? "",
    contact_number: input.contactNumber ?? "",
    default_room_type: input.defaultRoomType ?? "",
    typical_rate: input.typicalRate ?? 0,
    notes: input.notes ?? "",
    status: input.status,
  };
}

export async function fetchHotels(): Promise<HotelApi[]> {
  const res = await fetch("/api/hotels?all=1", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load hotels");
  const data = (await res.json()) as { hotels?: HotelApi[] };
  return data.hotels ?? [];
}

export type HotelsListQuery = {
  search?: string;
  status?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  colFilters?: Array<Record<string, unknown>>;
};

export type HotelsListPaginationApi = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type HotelsListResponse = {
  hotels: HotelApi[];
  pagination: HotelsListPaginationApi;
};

export async function fetchHotelsPage(query: HotelsListQuery = {}): Promise<HotelsListResponse> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status?.length) params.set("status", query.status.join(","));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  if (query.colFilters?.length) params.set("colFilters", JSON.stringify(query.colFilters));
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 25));
  const qs = params.toString();
  const res = await fetch(`/api/hotels?${qs}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to load hotels");
  }
  const data = (await res.json()) as HotelsListResponse;
  return {
    hotels: data.hotels ?? [],
    pagination: data.pagination ?? {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      total: data.hotels?.length ?? 0,
      totalPages: 1,
      hasMore: false,
    },
  };
}

export async function createHotelApi(payload: HotelWritePayload): Promise<HotelApi> {
  const res = await fetch("/api/hotels", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to create hotel template");
  }
  const data = (await res.json()) as { hotel: HotelApi };
  return data.hotel;
}

export async function updateHotelApi(
  id: string,
  payload: Partial<HotelWritePayload>
): Promise<HotelApi> {
  const res = await fetch(`/api/hotels/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update hotel template");
  }
  const data = (await res.json()) as { hotel: HotelApi };
  return data.hotel;
}

export async function deleteHotelApi(id: string): Promise<void> {
  const res = await fetch(`/api/hotels/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to delete hotel template");
  }
}
