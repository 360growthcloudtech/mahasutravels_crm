import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  createItineraryTemplate,
  isUniqueViolation,
  itineraryToDto,
  listItineraryTemplates,
  type CreateItineraryInput,
} from "@/lib/db/itineraries";
import {
  clampDiscountPercentage,
  clampVarchar,
  isItineraryStatus,
  normalizeDaysPlan,
  parseInclusions,
} from "@/lib/itinerary-utils";
import type { ItineraryDay } from "@/lib/data";

export const runtime = "nodejs";

function csvParam(value: string | null): string[] | undefined {
  if (!value?.trim()) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

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

function mapApiDaysPlan(value: unknown): ItineraryDay[] {
  if (!Array.isArray(value)) return [];
  return normalizeDaysPlan(
    value.map((item) => {
      if (!item || typeof item !== "object") return item;
      const row = item as Record<string, unknown>;
      return {
        day: row.day,
        title: row.title,
        detail: row.detail,
        hotelId: row.hotelId ?? row.hotel_id,
        hotelName: row.hotelName ?? row.hotel_name,
      };
    })
  );
}

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "NAME_REQUIRED":
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    case "TOUR_PACKAGE_REQUIRED":
      return NextResponse.json({ error: "tour_package is required" }, { status: 400 });
    case "DAYS_REQUIRED":
      return NextResponse.json({ error: "days_plan must have at least one day" }, { status: 400 });
    case "DAY_TITLE_REQUIRED":
      return NextResponse.json({ error: "each day needs a title" }, { status: 400 });
    case "SLUG_INVALID":
      return NextResponse.json({ error: "slug is invalid" }, { status: 400 });
    case "SLUG_TAKEN":
      return NextResponse.json({ error: "slug already exists" }, { status: 409 });
    default:
      if (error.message.startsWith("INVALID_HOTEL:")) {
        return NextResponse.json({ error: "hotel_id is invalid" }, { status: 400 });
      }
      return null;
  }
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const items = await listItineraryTemplates({
    search: url.searchParams.get("search") ?? undefined,
    status: csvParam(url.searchParams.get("status")),
  });

  return NextResponse.json({
    itineraries: items.map(({ row, days }) => itineraryToDto(row, days)),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = readString(body.name)?.trim() ?? "";
  const tourPackage = readString(body.tour_package)?.trim() ?? "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!tourPackage) return NextResponse.json({ error: "tour_package is required" }, { status: 400 });

  const statusRaw = readString(body.status);
  if (statusRaw !== undefined && !isItineraryStatus(statusRaw)) {
    return NextResponse.json({ error: "status is invalid" }, { status: 400 });
  }

  const daysPlan = mapApiDaysPlan(body.days_plan);
  if (!daysPlan.length) {
    return NextResponse.json({ error: "days_plan must have at least one day" }, { status: 400 });
  }

  const input: CreateItineraryInput = {
    name,
    slug: clampVarchar(readString(body.slug) ?? "", 255) || undefined,
    tour_package: tourPackage,
    subtitle: readString(body.subtitle)?.trim() ?? "",
    overview: readString(body.overview)?.trim() ?? "",
    inclusions: parseInclusions(body.inclusions),
    starting_from: readNumber(body.starting_from) ?? 0,
    discount_percentage: clampDiscountPercentage(body.discount_percentage),
    nights: clampVarchar(readString(body.nights) ?? "", 255),
    days: clampVarchar(readString(body.days) ?? "", 255),
    status: statusRaw && isItineraryStatus(statusRaw) ? statusRaw : "Draft",
    days_plan: daysPlan,
  };

  try {
    const created = await createItineraryTemplate(input);
    return NextResponse.json(
      { itinerary: itineraryToDto(created.row, created.days) },
      { status: 201 }
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "slug already exists" }, { status: 409 });
    }
    const mapped = mapError(error);
    if (mapped) return mapped;
    throw error;
  }
}
