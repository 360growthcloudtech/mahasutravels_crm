import type { AdPlatform, AdSpendEntry } from "@/lib/data";

export type AdSpendApi = {
  id: string;
  platform: AdPlatform;
  website: string;
  amount: number;
  spend_date: string;
  spend_time: string;
  campaign_name: string;
  leads_generated: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type AdSpendWritePayload = {
  platform: AdPlatform;
  website?: string;
  amount: number;
  spend_date: string;
  spend_time?: string;
  campaign_name?: string;
  leads_generated?: number;
  notes?: string;
};

export function adSpendFromApi(dto: AdSpendApi): AdSpendEntry {
  return {
    id: dto.id,
    platform: dto.platform,
    website: dto.website || undefined,
    amount: dto.amount ?? 0,
    date: dto.spend_date,
    time: dto.spend_time || "",
    campaignName: dto.campaign_name || undefined,
    leadsGenerated: dto.leads_generated ?? 0,
    notes: dto.notes || undefined,
    createdAt: dto.created_at || "",
  };
}

export function adSpendToWritePayload(
  input: Omit<AdSpendEntry, "id" | "createdAt"> | {
    platform: AdPlatform;
    website?: string;
    amount: number;
    date: string;
    time?: string;
    campaignName?: string;
    leadsGenerated?: number;
    notes?: string;
  }
): AdSpendWritePayload {
  return {
    platform: input.platform,
    website: input.website ?? "",
    amount: input.amount,
    spend_date: input.date,
    spend_time: input.time ?? "",
    campaign_name: input.campaignName ?? "",
    leads_generated: input.leadsGenerated ?? 0,
    notes: input.notes ?? "",
  };
}

export async function fetchAdSpends(): Promise<AdSpendApi[]> {
  const res = await fetch("/api/ad-spends?all=1", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load ad spends");
  const data = (await res.json()) as { adSpends?: AdSpendApi[] };
  return data.adSpends ?? [];
}

export type AdSpendsListQuery = {
  search?: string;
  platform?: string[];
  website?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  colFilters?: Array<Record<string, unknown>>;
};

export type AdSpendsListPaginationApi = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type AdSpendsListResponse = {
  adSpends: AdSpendApi[];
  pagination: AdSpendsListPaginationApi;
};

export async function fetchAdSpendsPage(
  query: AdSpendsListQuery = {}
): Promise<AdSpendsListResponse> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.platform?.length) params.set("platform", query.platform.join(","));
  if (query.website?.length) params.set("website", query.website.join(","));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  if (query.colFilters?.length) params.set("colFilters", JSON.stringify(query.colFilters));
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 25));
  const qs = params.toString();
  const res = await fetch(`/api/ad-spends?${qs}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to load ad spends");
  }
  const data = (await res.json()) as AdSpendsListResponse;
  return {
    adSpends: data.adSpends ?? [],
    pagination: data.pagination ?? {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      total: data.adSpends?.length ?? 0,
      totalPages: 1,
      hasMore: false,
    },
  };
}

export async function createAdSpendApi(payload: AdSpendWritePayload): Promise<AdSpendApi> {
  const res = await fetch("/api/ad-spends", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to create ad spend");
  }
  const data = (await res.json()) as { adSpend: AdSpendApi };
  return data.adSpend;
}

export async function updateAdSpendApi(
  id: string,
  payload: Partial<AdSpendWritePayload>
): Promise<AdSpendApi> {
  const res = await fetch(`/api/ad-spends/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update ad spend");
  }
  const data = (await res.json()) as { adSpend: AdSpendApi };
  return data.adSpend;
}

export async function deleteAdSpendApi(id: string): Promise<void> {
  const res = await fetch(`/api/ad-spends/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to delete ad spend");
  }
}
