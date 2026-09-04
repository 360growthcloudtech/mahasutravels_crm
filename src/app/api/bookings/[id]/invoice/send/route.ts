import { NextResponse } from "next/server";
import { forbidUnlessPermission, requireSession } from "@/lib/api-auth";
import {
  bookingToDto,
  findBookingById,
  isBookingOwnedBy,
  patchBooking,
} from "@/lib/db/bookings";
import { makeLeadHistoryEvent } from "@/lib/data";
import {
  sendBookingInvoiceWhatsApp,
  WhatsAppConfigError,
  WhatsAppSendError,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

function moneyPlain(n: number): string {
  return n.toLocaleString("en-IN");
}

function formatInvoiceDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = forbidUnlessPermission(session, "bookings.edit");
  if (denied) return denied;

  const { id } = await context.params;
  const row = await findBookingById(id);
  if (!row) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (session.role === "Employee") {
    const owned = await isBookingOwnedBy(row, session.sub, session.name || session.email || "");
    if (!owned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const booking = bookingToDto(row);
  if (!booking.phone.trim()) {
    return NextResponse.json(
      { error: "Booking has no phone number. Add a guest phone before sending." },
      { status: 400 }
    );
  }

  const travelDates = [
    booking.travel_date ? formatInvoiceDate(booking.travel_date) : "",
    booking.return_date ? formatInvoiceDate(booking.return_date) : "",
  ]
    .filter(Boolean)
    .join(" to ");

  try {
    const result = await sendBookingInvoiceWhatsApp(booking.phone, {
      customer: booking.customer,
      bookingNo: booking.booking_no,
      tourPackage: booking.tour_package,
      travelDates: travelDates || "as per booking",
      total: moneyPlain(booking.total),
      advance: moneyPlain(booking.advance),
      balance: moneyPlain(booking.balance),
      bookingId: booking.id,
    });

    const actor = session.name || session.email || "Staff";
    const history = [
      ...booking.history,
      makeLeadHistoryEvent("whatsapp", "Invoice sent", {
        detail: `WhatsApp to ${booking.phone}${result.messageId ? ` · ${result.messageId}` : ""}`,
        actor,
        createdAt: new Date().toISOString(),
      }),
    ];
    const updated = await patchBooking(id, { history });

    return NextResponse.json({
      ok: true,
      message_id: result.messageId,
      booking: bookingToDto(updated),
    });
  } catch (err) {
    if (err instanceof WhatsAppConfigError) {
      return NextResponse.json(
        { error: `${err.message}. Set WhatsApp env vars on the server.` },
        { status: 503 }
      );
    }
    if (err instanceof WhatsAppSendError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    console.error("[invoice/send]", err);
    return NextResponse.json({ error: "Failed to send invoice on WhatsApp" }, { status: 500 });
  }
}
