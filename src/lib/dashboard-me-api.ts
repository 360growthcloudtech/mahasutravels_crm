import type { EmployeeDashboardFilters, EmployeeDashboardPayload } from "@/lib/db/dashboard-me";

export type { EmployeeDashboardFilters, EmployeeDashboardPayload };

export type MyDashboardQuery = {
  from?: string | null;
  to?: string | null;
  website?: string | null;
};

export async function fetchMyDashboard(query: MyDashboardQuery = {}): Promise<EmployeeDashboardPayload> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.website) params.set("website", query.website);
  const qs = params.toString();
  const res = await fetch(`/api/dashboard/me${qs ? `?${qs}` : ""}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to load your dashboard");
  }
  const data = (await res.json()) as { dashboard: EmployeeDashboardPayload };
  return data.dashboard;
}
