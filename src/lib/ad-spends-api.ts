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
  const res = await fetch("/api/ad-spends", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load ad spends");
  const data = (await res.json()) as { adSpends?: AdSpendApi[] };
  return data.adSpends ?? [];
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
