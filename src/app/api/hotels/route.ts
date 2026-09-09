import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import { parseHotelsListFilters, parseLeadsPagination } from "@/lib/api/list-filters";
import {
  createHotelTemplate,
  hotelToDto,
  listHotelTemplates,
  listHotelTemplatesPage,
  type CreateHotelInput,
} from "@/lib/db/hotels";
import { isHotelTemplateStatus } from "@/lib/hotel-utils";

export const runtime = "nodejs";


function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = forbidUnlessPermission(session, "hotels.view");
  if (denied) return denied;

  const url = new URL(request.url);
  const filters = parseHotelsListFilters(url.searchParams);
  const { page, pageSize, paginated } = parseLeadsPagination(url.searchParams);

  if (!paginated) {
    const hotels = await listHotelTemplates(filters);
    return NextResponse.json({ hotels: hotels.map(hotelToDto) });
  }

  const offset = (page - 1) * pageSize;
  const result = await listHotelTemplatesPage(filters, { limit: pageSize, offset });
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize) || 1);

  return NextResponse.json({
    hotels: result.rows.map(hotelToDto),
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages,
      hasMore: page * pageSize < result.total,
    },
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const denied = forbidUnlessPermission(session, "hotels.create");
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = readString(body.name)?.trim() ?? "";
  const city = readString(body.city)?.trim() ?? "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!city) return NextResponse.json({ error: "city is required" }, { status: 400 });

  const statusRaw = readString(body.status);
  if (statusRaw !== undefined && !isHotelTemplateStatus(statusRaw)) {
    return NextResponse.json({ error: "status is invalid" }, { status: 400 });
  }

  const input: CreateHotelInput = {
    name,
    city,
    address: readString(body.address)?.trim() ?? "",
    contact_number: readString(body.contact_number)?.trim() ?? "",
    default_room_type: readString(body.default_room_type)?.trim() ?? "",
    typical_rate: readNumber(body.typical_rate) ?? 0,
    notes: readString(body.notes)?.trim() ?? "",
    status: statusRaw && isHotelTemplateStatus(statusRaw) ? statusRaw : "Draft",
  };

  const hotel = await createHotelTemplate(input);
  return NextResponse.json({ hotel: hotelToDto(hotel) }, { status: 201 });
}
