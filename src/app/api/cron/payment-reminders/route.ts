import { NextResponse } from "next/server";
import {
  bookingToDto,
  listBookingsDueForPaymentReminder,
  markPaymentReminderSent,
} from "@/lib/db/bookings";
import { notifyPaymentReminder } from "@/lib/booking-whatsapp-notify";
import {
  authorizeCronRequest,
  getCronSecret,
  getPaymentReminderCronConfig,
} from "@/lib/cron-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runPaymentReminders() {
  const config = getPaymentReminderCronConfig();
  const due = await listBookingsDueForPaymentReminder({
    hoursBefore: config.hoursBefore,
    windowMinutes: config.windowMinutes,
  });
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of due) {
    const dto = bookingToDto(row);
    // Claim first so overlapping cron ticks do not double-send.
    let claimed: Awaited<ReturnType<typeof markPaymentReminderSent>>;
    try {
      claimed = await markPaymentReminderSent(row.id, dto.history, { claimOnly: true });
    } catch (err) {
      console.error("[payment-reminders] failed to claim booking", row.id, err);
      errors += 1;
      continue;
    }
    if (!claimed) continue;

    const result = await notifyPaymentReminder(dto, { actor: "Cron" });
    sent += result.sent ? 1 : 0;
    skipped += result.skipped;
    errors += result.errors;

    if (result.events.length) {
      try {
        await markPaymentReminderSent(row.id, [...dto.history, ...result.events], {
          claimOnly: false,
        });
      } catch (err) {
        console.error("[payment-reminders] failed to append history", row.id, err);
      }
    }
  }

  return {
    ok: true,
    hours_before: config.hoursBefore,
    window_minutes: config.windowMinutes,
    scanned: due.length,
    sent,
    skipped,
    errors,
  };
}

export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getCronSecret()) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const config = getPaymentReminderCronConfig();
  if (!config.enabled) {
    return NextResponse.json({
      ok: true,
      disabled: true,
      reason: "CRON_PAYMENT_REMINDERS_ENABLED is false",
    });
  }

  try {
    const summary = await runPaymentReminders();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[payment-reminders]", err);
    return NextResponse.json({ error: "Payment reminder job failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
