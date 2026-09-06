import { NextResponse } from "next/server";
import {
  bookingToDto,
  listBookingsDueForTripReminder,
  markTripReminderSent,
} from "@/lib/db/bookings";
import { notifyTripReminders } from "@/lib/booking-whatsapp-notify";
import {
  authorizeCronRequest,
  getCronSecret,
  getTripReminderCronConfig,
} from "@/lib/cron-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runTripReminders() {
  const config = getTripReminderCronConfig();
  const due = await listBookingsDueForTripReminder({
    hoursBefore: config.hoursBefore,
    windowMinutes: config.windowMinutes,
  });
  let customerSent = 0;
  let driverSent = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of due) {
    const dto = bookingToDto(row);
    // Claim first so overlapping cron ticks do not double-send.
    let claimed: Awaited<ReturnType<typeof markTripReminderSent>>;
    try {
      claimed = await markTripReminderSent(row.id, dto.history, { claimOnly: true });
    } catch (err) {
      console.error("[trip-reminders] failed to claim booking", row.id, err);
      errors += 1;
      continue;
    }
    if (!claimed) continue;

    const result = await notifyTripReminders(dto, { actor: "Cron" });
    customerSent += result.customerSent ? 1 : 0;
    driverSent += result.driverSent;
    skipped += result.skipped;
    errors += result.errors;

    if (result.events.length) {
      try {
        await markTripReminderSent(row.id, [...dto.history, ...result.events], {
          claimOnly: false,
        });
      } catch (err) {
        console.error("[trip-reminders] failed to append history", row.id, err);
      }
    }
  }

  return {
    ok: true,
    hours_before: config.hoursBefore,
    window_minutes: config.windowMinutes,
    scanned: due.length,
    customer_sent: customerSent,
    driver_sent: driverSent,
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

  const config = getTripReminderCronConfig();
  if (!config.enabled) {
    return NextResponse.json({
      ok: true,
      disabled: true,
      reason: "CRON_TRIP_REMINDERS_ENABLED is false",
    });
  }

  try {
    const summary = await runTripReminders();
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[trip-reminders]", err);
    return NextResponse.json({ error: "Trip reminder job failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
