import { query } from "@/lib/db";
import type { AdPlatform } from "@/lib/data";
import { toDateOnly, toIso } from "@/lib/lead-utils";

export const AD_PLATFORMS: AdPlatform[] = [
  "Google Ads",
  "Meta Ads",
  "Website SEO",
  "Offline / Print",
  "Other",
];

export function isAdPlatform(value: unknown): value is AdPlatform {
  return typeof value === "string" && (AD_PLATFORMS as string[]).includes(value);
}

export type AdSpendRow = {
  id: string;
  platform: string;
  website: string;
  amount: string | number;
  spend_date: unknown;
  campaign_name: string;
  leads_generated: number;
  notes: string;
  created_at: unknown;
  updated_at: unknown;
};

export type AdSpendDto = {
  id: string;
  platform: AdPlatform;
  website: string;
  amount: number;
  spend_date: string;
  campaign_name: string;
  leads_generated: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type CreateAdSpendInput = {
  platform: AdPlatform;
  website?: string;
  amount: number;
  spend_date: string;
  campaign_name?: string;
  leads_generated?: number;
  notes?: string;
};

export type PatchAdSpendInput = {
  platform?: AdPlatform;
  website?: string;
  amount?: number;
  spend_date?: string;
  campaign_name?: string;
  leads_generated?: number;
  notes?: string;
};

export type ListAdSpendsFilters = {
  search?: string;
  platform?: string[];
  website?: string[];
};

const AD_SPEND_SELECT = `
  SELECT
    id,
    platform,
    website,
    amount,
    spend_date,
    campaign_name,
    leads_generated,
    notes,
    created_at,
    updated_at
  FROM ad_spends
`;

export function adSpendToDto(row: AdSpendRow): AdSpendDto {
  return {
    id: row.id,
    platform: row.platform as AdPlatform,
    website: row.website ?? "",
    amount: Number(row.amount) || 0,
    spend_date: toDateOnly(row.spend_date),
    campaign_name: row.campaign_name ?? "",
    leads_generated: Number(row.leads_generated) || 0,
    notes: row.notes ?? "",
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export async function findAdSpendById(id: string): Promise<AdSpendRow | null> {
  const { rows } = await query<AdSpendRow>(`${AD_SPEND_SELECT} WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listAdSpends(filters: ListAdSpendsFilters = {}): Promise<AdSpendRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(campaign_name) LIKE $${params.length}
        OR lower(notes) LIKE $${params.length}
        OR lower(website) LIKE $${params.length}
        OR lower(platform) LIKE $${params.length})`
    );
  }
  if (filters.platform?.length) {
    params.push(filters.platform);
    clauses.push(`platform = ANY($${params.length}::text[])`);
  }
  if (filters.website?.length) {
    params.push(filters.website);
    clauses.push(`website = ANY($${params.length}::text[])`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query<AdSpendRow>(
    `${AD_SPEND_SELECT} ${where} ORDER BY spend_date DESC, created_at DESC`,
    params
  );
  return rows;
}

export async function createAdSpend(input: CreateAdSpendInput): Promise<AdSpendRow> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO ad_spends (
      platform, website, amount, spend_date, campaign_name, leads_generated, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [
      input.platform,
      input.website?.trim() ?? "",
      Number(input.amount) || 0,
      input.spend_date,
      input.campaign_name?.trim() ?? "",
      Math.max(0, Math.floor(Number(input.leads_generated) || 0)),
      input.notes?.trim() ?? "",
    ]
  );

  const spend = await findAdSpendById(rows[0].id);
  if (!spend) throw new Error("Failed to load created ad spend");
  return spend;
}

export async function patchAdSpend(id: string, patch: PatchAdSpendInput): Promise<AdSpendRow> {
  const existing = await findAdSpendById(id);
  if (!existing) throw new Error("NOT_FOUND");

  await query(
    `UPDATE ad_spends SET
      platform = $2,
      website = $3,
      amount = $4,
      spend_date = $5,
      campaign_name = $6,
      leads_generated = $7,
      notes = $8,
      updated_at = now()
     WHERE id = $1`,
    [
      id,
      patch.platform !== undefined ? patch.platform : existing.platform,
      patch.website !== undefined ? patch.website.trim() : existing.website,
      patch.amount !== undefined ? Number(patch.amount) || 0 : Number(existing.amount) || 0,
      patch.spend_date !== undefined ? patch.spend_date : toDateOnly(existing.spend_date),
      patch.campaign_name !== undefined
        ? patch.campaign_name.trim()
        : existing.campaign_name,
      patch.leads_generated !== undefined
        ? Math.max(0, Math.floor(Number(patch.leads_generated) || 0))
        : Number(existing.leads_generated) || 0,
      patch.notes !== undefined ? patch.notes.trim() : existing.notes,
    ]
  );

  const spend = await findAdSpendById(id);
  if (!spend) throw new Error("NOT_FOUND");
  return spend;
}

export async function deleteAdSpend(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM ad_spends WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
