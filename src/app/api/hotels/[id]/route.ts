import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import {
  deleteHotelTemplate,
  findHotelTemplateById,
  hotelToDto,
  patchHotelTemplate,
  type PatchHotelInput,
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const hotel = await findHotelTemplateById(id);
  if (!hotel) return NextResponse.json({ error: "Hotel template not found" }, { status: 404 });
  return NextResponse.json({ hotel: hotelToDto(hotel) });
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

  const patch: PatchHotelInput = {};
  if (body.name !== undefined) {
    const name = readString(body.name)?.trim() ?? "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    patch.name = name;
  }
  if (body.city !== undefined) {
    const city = readString(body.city)?.trim() ?? "";
    if (!city) return NextResponse.json({ error: "city is required" }, { status: 400 });
    patch.city = city;
  }
  if (body.address !== undefined) patch.address = readString(body.address)?.trim() ?? "";
  if (body.contact_number !== undefined) {
    patch.contact_number = readString(body.contact_number)?.trim() ?? "";
  }
  if (body.default_room_type !== undefined) {
    patch.default_room_type = readString(body.default_room_type)?.trim() ?? "";
  }
  if (body.typical_rate !== undefined) patch.typical_rate = readNumber(body.typical_rate) ?? 0;
  if (body.notes !== undefined) patch.notes = readString(body.notes)?.trim() ?? "";
  if (body.status !== undefined) {
    const status = readString(body.status);
    if (!isHotelTemplateStatus(status)) {
      return NextResponse.json({ error: "status is invalid" }, { status: 400 });
    }
    patch.status = status;
  }

  try {
    const hotel = await patchHotelTemplate(id, patch);
    return NextResponse.json({ hotel: hotelToDto(hotel) });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Hotel template not found" }, { status: 404 });
    }
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
  const deleted = await deleteHotelTemplate(id);
  if (!deleted) return NextResponse.json({ error: "Hotel template not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
