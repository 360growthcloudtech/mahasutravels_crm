import type { Lead, LeadComment, LeadCustomItinerary, LeadHistoryAction, LeadHistoryEvent } from "@/lib/data";
import { buildExportParams, downloadCsvFromResponse } from "@/lib/csv-download";

export type LeadApiAssignee = { id: string; name: string } | null;

export type LeadApi = {
  id: string;
  lead_no: string;
  name: string;
  phone: string;
  email: string;
  pickup: string;
  drop: string;
  car: string;
  days: number;
  pickup_date: string;
  drop_date: string;
  next_follow_up_date: string;
  next_follow_up_time: string;
  price: number;
  source: string;
  city: string;
  website: string | null;
  tour_package: string;
  itinerary_template_id: string | null;
  vehicle_id: string | null;
  adults: number;
  kids: number;
  notes: string;
  status: Lead["status"];
  assigned_to: LeadApiAssignee;
  inquiry_count: number;
  previous_lead_id: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  page_url?: string | null;
  form_type?: string | null;
  created_at: string;
  updated_at: string;
  last_inquiry_at: string;
};

export type LeadCommentApi = {
  id: string;
  text: string;
  author: string;
  created_at: string;
};

export type LeadActivityApi = {
  id: string;
  action: string;
  label: string;
  detail?: string;
  actor: string;
  created_at: string;
};

export type LeadItineraryOverlay = {
  itineraryTemplateId?: string;
  customItinerary?: LeadCustomItinerary;
};

export type LeadWritePayload = {
  name: string;
  phone: string;
  email?: string;
  pickup?: string;
  drop?: string;
  car?: string;
  days?: number;
  pickup_date?: string;
  drop_date?: string;
  next_follow_up_date?: string | null;
  next_follow_up_time?: string | null;
  price?: number;
  source: string;
  city?: string;
  website?: string | null;
  tour_package?: string;
  itinerary_template_id?: string | null;
  vehicle_id?: string | null;
  adults?: number;
  kids?: number;
  notes?: string;
  status?: Lead["status"];
  assigned_to?: string | null;
};

export function leadFromApi(dto: LeadApi, overlay?: LeadItineraryOverlay): Lead {
  return {
    id: dto.id,
    leadNo: dto.lead_no,
    name: dto.name,
    email: dto.email ?? "",
    city: dto.city ?? "",
    phone: dto.phone,
    source: dto.source,
    website: dto.website || undefined,
    pageUrl: dto.page_url || undefined,
    utmSource: dto.utm_source || undefined,
    utmMedium: dto.utm_medium || undefined,
    utmCampaign: dto.utm_campaign || undefined,
    utmTerm: dto.utm_term || undefined,
    utmContent: dto.utm_content || undefined,
    formType: dto.form_type || undefined,
    tourPackage: dto.tour_package ?? "",
    pickup: dto.pickup ?? "",
    drop: dto.drop ?? "",
    pickupDate: dto.pickup_date ?? "",
    dropDate: dto.drop_date ?? "",
    nextFollowUpDate: dto.next_follow_up_date ?? "",
    nextFollowUpTime: dto.next_follow_up_time ?? "",
    car: dto.car ?? "",
    vehicleId: dto.vehicle_id || undefined,
    adults: dto.adults ?? 0,
    kids: dto.kids ?? 0,
    days: dto.days ?? 0,
    notes: dto.notes ?? "",
    status: dto.status,
    assignedTo: dto.assigned_to,
    price: dto.price ?? 0,
    inquiryCount: dto.inquiry_count ?? 1,
    previousLeadId: dto.previous_lead_id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    lastInquiryAt: dto.last_inquiry_at,
    itineraryTemplateId: dto.itinerary_template_id || overlay?.itineraryTemplateId || undefined,
    customItinerary: overlay?.customItinerary,
  };
}

export function commentFromApi(dto: LeadCommentApi): LeadComment {
  return {
    id: dto.id,
    text: dto.text,
    author: dto.author,
    createdAt: dto.created_at,
  };
}

export function activityFromApi(dto: LeadActivityApi): LeadHistoryEvent {
  return {
    id: dto.id,
    action: (dto.action as LeadHistoryAction) || "note",
    label: dto.label,
    detail: dto.detail,
    actor: dto.actor,
    createdAt: dto.created_at,
  };
}

export function leadToWritePayload(input: {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  source: string;
  website?: string;
  tourPackage?: string;
  itineraryTemplateId?: string | null;
  vehicleId?: string | null;
  pickup?: string;
  drop?: string;
  pickupDate?: string;
  dropDate?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  car?: string;
  adults?: number | "";
  kids?: number | "";
  days?: number | "";
  notes?: string;
  status?: Lead["status"];
  assignedToId?: string | null;
  price?: number | "";
}): LeadWritePayload {
  return {
    name: input.name,
    phone: input.phone,
    email: input.email ?? "",
    pickup: input.pickup ?? "",
    drop: input.drop ?? "",
    car: input.car ?? "",
    days: input.days === "" || input.days == null ? 0 : Number(input.days),
    pickup_date: input.pickupDate || undefined,
    drop_date: input.dropDate || undefined,
    next_follow_up_date: input.nextFollowUpDate || null,
    next_follow_up_time: input.nextFollowUpTime || null,
    price: input.price === "" || input.price == null ? 0 : Number(input.price),
    source: input.source,
    city: input.city ?? "",
    website: input.website || null,
    tour_package: input.tourPackage ?? "",
    itinerary_template_id: input.itineraryTemplateId ?? null,
    vehicle_id: input.vehicleId ?? null,
    adults: input.adults === "" || input.adults == null ? 0 : Number(input.adults),
    kids: input.kids === "" || input.kids == null ? 0 : Number(input.kids),
    notes: input.notes ?? "",
    status: input.status,
    assigned_to: input.assignedToId ?? null,
  };
}

export async function fetchLeads(): Promise<LeadApi[]> {
  const res = await fetch("/api/leads?all=1", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load leads");
  const data = (await res.json()) as { leads?: LeadApi[] };
  return data.leads ?? [];
}

export type LeadsListQuery = {
  search?: string;
  status?: string[];
  source?: string[];
  website?: string[];
  assigned_to?: string[];
  page?: number;
  pageSize?: number;
};

export type LeadsListStatsApi = {
  total: number;
  booked: number;
  open: number;
  repeat: number;
};

export type LeadsListPaginationApi = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type LeadsListResponse = {
  leads: LeadApi[];
  pagination: LeadsListPaginationApi;
  stats: LeadsListStatsApi;
};

export async function fetchLeadsPage(query: LeadsListQuery = {}): Promise<LeadsListResponse> {
  const params = buildExportParams({
    search: query.search,
    status: query.status,
    source: query.source,
    website: query.website,
    assigned_to: query.assigned_to,
  });
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 25));
  const qs = params.toString();
  const res = await fetch(`/api/leads?${qs}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to load leads");
  }
  const data = (await res.json()) as LeadsListResponse;
  return {
    leads: data.leads ?? [],
    pagination: data.pagination ?? {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 25,
      total: data.leads?.length ?? 0,
      totalPages: 1,
      hasMore: false,
    },
    stats: data.stats ?? {
      total: data.leads?.length ?? 0,
      booked: 0,
      open: 0,
      repeat: 0,
    },
  };
}

export type LeadsExportQuery = {
  search?: string;
  status?: string[];
  source?: string[];
  website?: string[];
  assigned_to?: string[];
};

export async function downloadLeadsCsv(query: LeadsExportQuery = {}): Promise<number> {
  const params = buildExportParams({
    search: query.search,
    status: query.status,
    source: query.source,
    website: query.website,
    assigned_to: query.assigned_to,
  });
  const qs = params.toString();
  const res = await fetch(`/api/leads/export${qs ? `?${qs}` : ""}`, {
    credentials: "include",
    cache: "no-store",
  });
  return downloadCsvFromResponse(res, "leads-export.csv");
}

export async function createLeadApi(payload: LeadWritePayload): Promise<{ lead: LeadApi; repeat_inquiry: boolean }> {
  const res = await fetch("/api/leads", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to create lead");
  }
  const data = (await res.json()) as { lead: LeadApi; repeat_inquiry?: boolean };
  return { lead: data.lead, repeat_inquiry: Boolean(data.repeat_inquiry) };
}

export async function updateLeadApi(id: string, payload: Partial<LeadWritePayload>): Promise<LeadApi> {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to update lead");
  }
  const data = (await res.json()) as { lead: LeadApi };
  return data.lead;
}

export async function deleteLeadApi(id: string): Promise<void> {
  const res = await fetch(`/api/leads/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to delete lead");
  }
}

export async function fetchLeadComments(id: string): Promise<LeadCommentApi[]> {
  const res = await fetch(`/api/leads/${id}/comments`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load comments");
  const data = (await res.json()) as { comments?: LeadCommentApi[] };
  return data.comments ?? [];
}

export async function createLeadCommentApi(id: string, text: string): Promise<LeadCommentApi> {
  const res = await fetch(`/api/leads/${id}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to add comment");
  }
  const data = (await res.json()) as { comment: LeadCommentApi };
  return data.comment;
}

export async function fetchLeadActivity(id: string): Promise<LeadActivityApi[]> {
  const res = await fetch(`/api/leads/${id}/activity`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load activity");
  const data = (await res.json()) as { activity?: LeadActivityApi[] };
  return data.activity ?? [];
}

export async function createLeadActivityApi(
  id: string,
  payload: { action: string; label: string; detail?: string }
): Promise<LeadActivityApi[]> {
  const res = await fetch(`/api/leads/${id}/activity`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Failed to record activity");
  }
  const data = (await res.json()) as { activity?: LeadActivityApi[] };
  return data.activity ?? [];
}

export async function fetchAssignees(): Promise<{ id: string; name: string; email: string; role: string }[]> {
  const res = await fetch("/api/users", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load users");
  const data = (await res.json()) as { users?: { id: string; name: string; email: string; role: string }[] };
  return data.users ?? [];
}

export type LeadStatusMasterApi = {
  id: string;
  code: string;
  label: string;
  is_closed: boolean;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
};

export type LeadSourceMasterApi = {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export type WebsiteMasterApi = {
  id: string;
  domain: string;
  url: string;
  label: string;
  badge: string | null;
  sort_order: number;
  is_active: boolean;
};

export async function fetchLeadMasters(): Promise<{
  statuses: LeadStatusMasterApi[];
  sources: LeadSourceMasterApi[];
  websites: WebsiteMasterApi[];
}> {
  const res = await fetch("/api/leads/masters", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load lead masters");
  const data = (await res.json()) as {
    statuses?: LeadStatusMasterApi[];
    sources?: LeadSourceMasterApi[];
    websites?: WebsiteMasterApi[];
  };
  return {
    statuses: data.statuses ?? [],
    sources: data.sources ?? [],
    websites: data.websites ?? [],
  };
}

export type VehicleOptionApi = {
  id: string;
  vehicle_type: string;
  registration_number: string;
  capacity: number;
  driver_name: string;
  driver_status: string;
};

export async function fetchVehicleOptions(): Promise<VehicleOptionApi[]> {
  const res = await fetch("/api/vehicles/options", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load vehicles");
  const data = (await res.json()) as { vehicles?: VehicleOptionApi[] };
  return data.vehicles ?? [];
}
