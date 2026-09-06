import { makeLeadHistoryEvent, type LeadHistoryEvent } from "@/lib/data";
import { bookingDrivers, collectAssignedDriverNames } from "@/lib/booking-utils";
import type { BookingDto } from "@/lib/db/bookings";
import { findDriverByName } from "@/lib/db/drivers";
import { formatDisplayTime } from "@/lib/lead-utils";
import {
  sendBookingConfirmedWhatsApp,
  sendDriverAssignmentWhatsApp,
  sendDriverTripReminderWhatsApp,
  sendPaymentReminderWhatsApp,
  sendTripReminderWhatsApp,
  toWhatsAppRecipient,
  WhatsAppConfigError,
  WhatsAppSendError,
} from "@/lib/whatsapp";

function formatTravelDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatBookingTravelDates(booking: Pick<BookingDto, "travel_date" | "return_date">): string {
  const parts = [
    booking.travel_date ? formatTravelDate(booking.travel_date) : "",
    booking.return_date ? formatTravelDate(booking.return_date) : "",
  ].filter(Boolean);
  return parts.join(" to ") || "as per booking";
}

/** e.g. "10 Sep, 6:00 am" */
export function formatPickupDateTimeLabel(
  booking: Pick<BookingDto, "travel_date" | "pickup_time">
): string {
  const datePart = booking.travel_date ? formatTravelDate(booking.travel_date) : "";
  const timePart = formatDisplayTime(booking.pickup_time || "");
  if (datePart && timePart) return `${datePart}, ${timePart}`;
  return datePart || timePart || "as per booking";
}

function driverLabels(booking: BookingDto): { drivers: string; vehicles: string } {
  const assignments = bookingDrivers({
    driver: booking.driver,
    vehicle: booking.vehicle,
    drivers: booking.drivers,
  });
  if (!assignments.length) {
    return { drivers: "To be assigned", vehicles: "—" };
  }
  const names = assignments.map((a) => a.driver.trim()).filter(Boolean);
  const vehicles = assignments.map((a) => a.vehicle.trim()).filter(Boolean);
  return {
    drivers: names.join(", ") || "To be assigned",
    vehicles: vehicles.join(", ") || "—",
  };
}

function whatsappHistory(
  label: string,
  detail: string,
  actor?: string
): LeadHistoryEvent {
  return makeLeadHistoryEvent("whatsapp", label, {
    detail,
    actor: actor || "System",
    createdAt: new Date().toISOString(),
  });
}

function errorDetail(err: unknown): string {
  if (err instanceof WhatsAppConfigError || err instanceof WhatsAppSendError) {
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Unknown WhatsApp error";
}

/** Send booking_confirmed to the customer. Never throws. */
export async function notifyBookingConfirmed(
  booking: BookingDto,
  opts?: { actor?: string }
): Promise<LeadHistoryEvent[]> {
  const events: LeadHistoryEvent[] = [];
  const phone = booking.phone?.trim() || "";
  if (!phone || !toWhatsAppRecipient(phone)) {
    events.push(
      whatsappHistory(
        "Customer WhatsApp skipped",
        "No valid Indian mobile on booking",
        opts?.actor
      )
    );
    return events;
  }

  const labels = driverLabels(booking);
  try {
    const result = await sendBookingConfirmedWhatsApp(phone, {
      customer: booking.customer,
      bookingNo: booking.booking_no,
      tourPackage: booking.tour_package,
      travelDates: formatBookingTravelDates(booking),
      pickup: booking.pickup,
      driver: labels.drivers,
      vehicle: labels.vehicles,
      bookingId: booking.id,
    });
    events.push(
      whatsappHistory(
        "Booking confirmation sent",
        `WhatsApp to ${phone}${result.messageId ? ` · ${result.messageId}` : ""}`,
        opts?.actor
      )
    );
  } catch (err) {
    events.push(
      whatsappHistory(
        "Customer WhatsApp failed",
        errorDetail(err),
        opts?.actor
      )
    );
  }
  return events;
}

/**
 * Send driver_assignment to each named driver (deduped).
 * Resolves phone from drivers master by name. Never throws.
 */
export async function notifyDriversAssigned(
  booking: BookingDto,
  driverNames: string[],
  opts?: { actor?: string }
): Promise<LeadHistoryEvent[]> {
  const events: LeadHistoryEvent[] = [];
  const unique = [...new Set(driverNames.map((n) => n.trim()).filter(Boolean))];
  if (!unique.length) return events;

  const assignments = bookingDrivers({
    driver: booking.driver,
    vehicle: booking.vehicle,
    drivers: booking.drivers,
  });
  const vehicleByName = new Map(
    assignments.map((a) => [a.driver.trim().toLowerCase(), a.vehicle.trim()] as const)
  );

  for (const name of unique) {
    const row = await findDriverByName(name);
    if (!row) {
      events.push(
        whatsappHistory(
          "Driver WhatsApp skipped",
          `Driver "${name}" not found in master`,
          opts?.actor
        )
      );
      continue;
    }
    if (!toWhatsAppRecipient(row.phone)) {
      events.push(
        whatsappHistory(
          "Driver WhatsApp skipped",
          `Invalid phone for driver "${name}"`,
          opts?.actor
        )
      );
      continue;
    }

    const vehicle =
      vehicleByName.get(name.toLowerCase()) ||
      row.registration_number?.trim() ||
      "—";

    try {
      const result = await sendDriverAssignmentWhatsApp(row.phone, {
        driverName: row.name,
        bookingNo: booking.booking_no,
        guestName: booking.customer,
        tourPackage: booking.tour_package,
        travelDates: formatBookingTravelDates(booking),
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        vehicle,
      });
      events.push(
        whatsappHistory(
          "Driver assignment sent",
          `WhatsApp to ${row.name} (${row.phone})${
            result.messageId ? ` · ${result.messageId}` : ""
          }`,
          opts?.actor
        )
      );
    } catch (err) {
      events.push(
        whatsappHistory(
          "Driver WhatsApp failed",
          `${name}: ${errorDetail(err)}`,
          opts?.actor
        )
      );
    }
  }

  return events;
}

export type TripReminderNotifyResult = {
  events: LeadHistoryEvent[];
  customerSent: boolean;
  driverSent: number;
  skipped: number;
  errors: number;
};

/** 3h trip reminder to customer + all assigned drivers (guest phone on driver msg). */
export async function notifyTripReminders(
  booking: BookingDto,
  opts?: { actor?: string }
): Promise<TripReminderNotifyResult> {
  const events: LeadHistoryEvent[] = [];
  let customerSent = false;
  let driverSent = 0;
  let skipped = 0;
  let errors = 0;
  const actor = opts?.actor || "System";
  const labels = driverLabels(booking);
  const pickupLabel = formatPickupDateTimeLabel(booking);

  const phone = booking.phone?.trim() || "";
  if (!phone || !toWhatsAppRecipient(phone)) {
    events.push(
      whatsappHistory("Trip reminder skipped", "No valid Indian mobile on booking", actor)
    );
    skipped += 1;
  } else {
    try {
      const result = await sendTripReminderWhatsApp(phone, {
        customer: booking.customer,
        bookingNo: booking.booking_no,
        tourPackage: booking.tour_package,
        pickupTimeLabel: pickupLabel,
        pickup: booking.pickup,
        driver: labels.drivers,
        vehicle: labels.vehicles,
      });
      customerSent = true;
      events.push(
        whatsappHistory(
          "Trip reminder sent",
          `WhatsApp to ${phone}${result.messageId ? ` · ${result.messageId}` : ""}`,
          actor
        )
      );
    } catch (err) {
      errors += 1;
      events.push(whatsappHistory("Trip reminder failed", errorDetail(err), actor));
    }
  }

  const driverNames = collectAssignedDriverNames(booking.driver, booking.drivers);
  if (!driverNames.length) {
    events.push(
      whatsappHistory("Driver trip reminder skipped", "No driver assigned", actor)
    );
    skipped += 1;
  } else {
    const assignments = bookingDrivers({
      driver: booking.driver,
      vehicle: booking.vehicle,
      drivers: booking.drivers,
    });
    const vehicleByName = new Map(
      assignments.map((a) => [a.driver.trim().toLowerCase(), a.vehicle.trim()] as const)
    );

    for (const name of driverNames) {
      const row = await findDriverByName(name);
      if (!row) {
        events.push(
          whatsappHistory(
            "Driver trip reminder skipped",
            `Driver "${name}" not found in master`,
            actor
          )
        );
        skipped += 1;
        continue;
      }
      if (!toWhatsAppRecipient(row.phone)) {
        events.push(
          whatsappHistory(
            "Driver trip reminder skipped",
            `Invalid phone for driver "${name}"`,
            actor
          )
        );
        skipped += 1;
        continue;
      }

      const vehicle =
        vehicleByName.get(name.toLowerCase()) ||
        row.registration_number?.trim() ||
        "—";

      try {
        const result = await sendDriverTripReminderWhatsApp(row.phone, {
          driverName: row.name,
          bookingNo: booking.booking_no,
          guestName: booking.customer,
          guestPhone: booking.phone || "—",
          tourPackage: booking.tour_package,
          pickupTimeLabel: pickupLabel,
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          vehicle,
        });
        driverSent += 1;
        events.push(
          whatsappHistory(
            "Driver trip reminder sent",
            `WhatsApp to ${row.name} (${row.phone})${
              result.messageId ? ` · ${result.messageId}` : ""
            }`,
            actor
          )
        );
      } catch (err) {
        errors += 1;
        events.push(
          whatsappHistory(
            "Driver trip reminder failed",
            `${name}: ${errorDetail(err)}`,
            actor
          )
        );
      }
    }
  }

  return { events, customerSent, driverSent, skipped, errors };
}

export type PaymentReminderNotifyResult = {
  events: LeadHistoryEvent[];
  sent: boolean;
  skipped: number;
  errors: number;
};

/** 12h unpaid-balance reminder to the customer only. Never throws. */
export async function notifyPaymentReminder(
  booking: BookingDto,
  opts?: { actor?: string }
): Promise<PaymentReminderNotifyResult> {
  const events: LeadHistoryEvent[] = [];
  let sent = false;
  let skipped = 0;
  let errors = 0;
  const actor = opts?.actor || "System";
  const phone = booking.phone?.trim() || "";

  if (!phone || !toWhatsAppRecipient(phone)) {
    events.push(
      whatsappHistory(
        "Payment reminder skipped",
        "No valid Indian mobile on booking",
        actor
      )
    );
    return { events, sent, skipped: 1, errors };
  }

  try {
    const result = await sendPaymentReminderWhatsApp(phone, {
      customer: booking.customer,
      bookingNo: booking.booking_no,
      tourPackage: booking.tour_package,
      pickupTimeLabel: formatPickupDateTimeLabel(booking),
      balance: booking.balance.toLocaleString("en-IN"),
      bookingId: booking.id,
    });
    sent = true;
    events.push(
      whatsappHistory(
        "Payment reminder sent",
        `WhatsApp to ${phone} · balance ₹${booking.balance.toLocaleString("en-IN")}${
          result.messageId ? ` · ${result.messageId}` : ""
        }`,
        actor
      )
    );
  } catch (err) {
    errors += 1;
    events.push(whatsappHistory("Payment reminder failed", errorDetail(err), actor));
  }

  return { events, sent, skipped, errors };
}

/** Newly assigned names present in `next` but not in `prev` (case-insensitive). */
export function newlyAssignedDriverNames(prev: string[], next: string[]): string[] {
  const prevSet = new Set(prev.map((n) => n.trim().toLowerCase()).filter(Boolean));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of next) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (prevSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
