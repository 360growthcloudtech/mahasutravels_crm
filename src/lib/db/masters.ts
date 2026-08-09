import { query } from "@/lib/db";

export type LeadStatusMaster = {
  id: string;
  code: string;
  label: string;
  is_closed: boolean;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
};

export type LeadSourceMaster = {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export type WebsiteMaster = {
  id: string;
  domain: string;
  url: string;
  label: string;
  badge: string | null;
  sort_order: number;
  is_active: boolean;
};

export function normalizeWebsiteDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export async function listLeadStatuses(activeOnly = true): Promise<LeadStatusMaster[]> {
  const { rows } = await query<LeadStatusMaster>(
    `SELECT id, code, label, is_closed, is_default, sort_order, is_active
     FROM lead_statuses
     ${activeOnly ? "WHERE is_active = true" : ""}
     ORDER BY sort_order ASC, label ASC`
  );
  return rows;
}

export async function listLeadSources(activeOnly = true): Promise<LeadSourceMaster[]> {
  const { rows } = await query<LeadSourceMaster>(
    `SELECT id, code, label, sort_order, is_active
     FROM lead_sources
     ${activeOnly ? "WHERE is_active = true" : ""}
     ORDER BY sort_order ASC, label ASC`
  );
  return rows;
}

export async function listWebsites(activeOnly = true): Promise<WebsiteMaster[]> {
  const { rows } = await query<WebsiteMaster>(
    `SELECT id, domain, url, label, badge, sort_order, is_active
     FROM websites
     ${activeOnly ? "WHERE is_active = true" : ""}
     ORDER BY sort_order ASC, label ASC`
  );
  return rows;
}

export async function getDefaultStatusCode(): Promise<string> {
  const { rows } = await query<{ code: string }>(
    `SELECT code FROM lead_statuses
     WHERE is_active = true AND is_default = true
     ORDER BY sort_order ASC
     LIMIT 1`
  );
  return rows[0]?.code ?? "New";
}

export async function resolveStatusCode(value: unknown): Promise<string | null> {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const lower = raw.toLowerCase().replace(/\s+/g, "-");
  const statuses = await listLeadStatuses(true);
  const exact = statuses.find((s) => s.code === raw);
  if (exact) return exact.code;
  const byCode = statuses.find((s) => s.code.toLowerCase().replace(/\s+/g, "-") === lower);
  if (byCode) return byCode.code;
  const byLabel = statuses.find((s) => s.label.toLowerCase().replace(/\s+/g, "-") === lower);
  return byLabel?.code ?? null;
}

export async function resolveSourceCode(value: unknown): Promise<string | null> {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const lower = raw.toLowerCase();
  const sources = await listLeadSources(true);
  return (
    sources.find((s) => s.code === raw)?.code ??
    sources.find((s) => s.code.toLowerCase() === lower)?.code ??
    sources.find((s) => s.label.toLowerCase() === lower)?.code ??
    null
  );
}

export async function resolveWebsiteDomain(value: unknown): Promise<string | null> {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const domain = normalizeWebsiteDomain(value);
  if (!domain) return null;
  const sites = await listWebsites(true);
  return sites.find((s) => s.domain.toLowerCase() === domain)?.domain ?? null;
}
