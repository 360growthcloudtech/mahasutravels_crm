import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  deleteItineraryTemplate,
  findItineraryTemplateById,
  isUniqueViolation,
  itineraryToDto,
  patchItineraryTemplate,
  type PatchItineraryInput,
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
    case "NOT_FOUND":
      return NextResponse.json({ error: "Itinerary template not found" }, { status: 404 });
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const found = await findItineraryTemplateById(id);
  if (!found) {
    return NextResponse.json({ error: "Itinerary template not found" }, { status: 404 });
  }
  return NextResponse.json({ itinerary: itineraryToDto(found.row, found.days) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: PatchItineraryInput = {};
  if (body.name !== undefined) {
    const name = readString(body.name)?.trim() ?? "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    patch.name = name;
  }
  if (body.slug !== undefined) patch.slug = clampVarchar(readString(body.slug) ?? "", 255);
  if (body.tour_package !== undefined) {
    const tourPackage = readString(body.tour_package)?.trim() ?? "";
    if (!tourPackage) {
      return NextResponse.json({ error: "tour_package is required" }, { status: 400 });
    }
    patch.tour_package = tourPackage;
  }
  if (body.subtitle !== undefined) patch.subtitle = readString(body.subtitle)?.trim() ?? "";
  if (body.overview !== undefined) patch.overview = readString(body.overview)?.trim() ?? "";
  if (body.inclusions !== undefined) patch.inclusions = parseInclusions(body.inclusions);
  if (body.starting_from !== undefined) patch.starting_from = readNumber(body.starting_from) ?? 0;
  if (body.discount_percentage !== undefined) {
    patch.discount_percentage = clampDiscountPercentage(body.discount_percentage);
  }
  if (body.nights !== undefined) patch.nights = clampVarchar(readString(body.nights) ?? "", 255);
  if (body.days !== undefined) patch.days = clampVarchar(readString(body.days) ?? "", 255);
  if (body.status !== undefined) {
    const status = readString(body.status);
    if (!isItineraryStatus(status)) {
      return NextResponse.json({ error: "status is invalid" }, { status: 400 });
    }
    patch.status = status;
  }
  if (body.days_plan !== undefined) {
    const daysPlan = mapApiDaysPlan(body.days_plan);
    if (!daysPlan.length) {
      return NextResponse.json({ error: "days_plan must have at least one day" }, { status: 400 });
    }
    patch.days_plan = daysPlan;
  }

  try {
    const updated = await patchItineraryTemplate(id, patch);
    return NextResponse.json({ itinerary: itineraryToDto(updated.row, updated.days) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "slug already exists" }, { status: 409 });
    }
    const mapped = mapError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const deleted = await deleteItineraryTemplate(id);
  if (!deleted) {
    return NextResponse.json({ error: "Itinerary template not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
