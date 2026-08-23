import type { DashboardFilters, DashboardPayload } from "@/lib/db/dashboard";

export type { DashboardFilters, DashboardPayload };

export type DashboardQuery = {
  from?: string | null;
  to?: string | null;
  website?: string | null;
  source?: string | null;
};

export async function fetchDashboard(query: DashboardQuery = {}): Promise<DashboardPayload> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.website) params.set("website", query.website);
  if (query.source) params.set("source", query.source);
  const qs = params.toString();
  const res = await fetch(`/api/dashboard${qs ? `?${qs}` : ""}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to load dashboard");
  }
  const data = (await res.json()) as { dashboard: DashboardPayload };
  return data.dashboard;
}
