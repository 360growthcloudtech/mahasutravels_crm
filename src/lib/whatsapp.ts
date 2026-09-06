import { normalizePhone } from "@/lib/lead-utils";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";

export type WhatsAppInvoiceTemplateParams = {
  customer: string;
  bookingNo: string;
  tourPackage: string;
  travelDates: string;
  total: string;
  advance: string;
  balance: string;
  /** Path suffix for the dynamic URL button (booking UUID). */
  bookingId: string;
};

export type WhatsAppQuoteTemplateParams = {
  customer: string;
  tourTitle: string;
  destination: string;
  travelDates: string;
  vehicle: string;
  amount: string;
  /** Path suffix for the dynamic URL button (lead UUID). */
  leadId: string;
};

export type WhatsAppBookingConfirmedParams = {
  customer: string;
  bookingNo: string;
  tourPackage: string;
  travelDates: string;
  pickup: string;
  driver: string;
  vehicle: string;
  /** Path suffix for the dynamic URL button (booking UUID). */
  bookingId: string;
};

export type WhatsAppDriverAssignmentParams = {
  driverName: string;
  bookingNo: string;
  guestName: string;
  tourPackage: string;
  travelDates: string;
  pickup: string;
  dropoff: string;
  vehicle: string;
};

export type WhatsAppTripReminderParams = {
  customer: string;
  bookingNo: string;
  tourPackage: string;
  pickupTimeLabel: string;
  pickup: string;
  driver: string;
  vehicle: string;
};

export type WhatsAppDriverTripReminderParams = {
  driverName: string;
  bookingNo: string;
  guestName: string;
  guestPhone: string;
  tourPackage: string;
  pickupTimeLabel: string;
  pickup: string;
  dropoff: string;
  vehicle: string;
};

export type WhatsAppPaymentReminderParams = {
  customer: string;
  bookingNo: string;
  tourPackage: string;
  pickupTimeLabel: string;
  /** Plain amount digits for template body (template includes ₹). */
  balance: string;
  /** Path suffix for the dynamic URL button (booking UUID). */
  bookingId: string;
};

export class WhatsAppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppConfigError";
  }
}

export class WhatsAppSendError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "WhatsAppSendError";
    this.status = status;
    this.details = details;
  }
}

/** Digits-only E.164 for India: 91 + 10-digit mobile. */
export function toWhatsAppRecipient(phone: string): string | null {
  const digits = normalizePhone(phone);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `91${digits}`;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new WhatsAppConfigError(`${name} is not configured`);
  return value;
}

function cleanParam(value: string, fallback = "—"): string {
  const trimmed = value.replace(/[\n\t]/g, " ").replace(/\s+/g, " ").trim();
  // Meta rejects empty body parameters.
  return trimmed || fallback;
}

async function sendTemplateMessage(args: {
  phone: string;
  templateName: string;
  language: string;
  bodyParameters: string[];
  /** When set, includes a dynamic URL button with this path suffix. */
  buttonSuffix?: string;
}): Promise<{ messageId: string | null }> {
  const token = requireEnv("WHATSAPP_TOKEN");
  const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");

  const to = toWhatsAppRecipient(args.phone);
  if (!to) {
    throw new WhatsAppSendError("Phone is not a valid Indian mobile number", 400);
  }

  const components: Array<Record<string, unknown>> = [
    {
      type: "body",
      parameters: args.bodyParameters.map((text) => ({ type: "text" as const, text })),
    },
  ];

  if (args.buttonSuffix !== undefined) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: cleanParam(args.buttonSuffix) }],
    });
  }

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: args.templateName,
      language: { code: args.language },
      components,
    },
  };

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => null)) as
    | {
        messages?: Array<{ id?: string }>;
        error?: { message?: string; error_user_msg?: string };
      }
    | null;

  if (!res.ok) {
    const message =
      data?.error?.error_user_msg ||
      data?.error?.message ||
      `WhatsApp API error (${res.status})`;
    throw new WhatsAppSendError(message, res.status, data);
  }

  return { messageId: data?.messages?.[0]?.id ?? null };
}

/**
 * Send the booking_invoice utility template via Meta Cloud API.
 * Body vars 1–7 + URL button suffix (booking id).
 */
export async function sendBookingInvoiceWhatsApp(
  phone: string,
  params: WhatsAppInvoiceTemplateParams
): Promise<{ messageId: string | null }> {
  const templateName = process.env.WHATSAPP_INVOICE_TEMPLATE?.trim() || "booking_invoice";
  const language = process.env.WHATSAPP_INVOICE_TEMPLATE_LANG?.trim() || "en";

  return sendTemplateMessage({
    phone,
    templateName,
    language,
    bodyParameters: [
      cleanParam(params.customer, "Guest"),
      cleanParam(params.bookingNo),
      cleanParam(params.tourPackage, "Tour package"),
      cleanParam(params.travelDates),
      cleanParam(params.total, "0"),
      cleanParam(params.advance, "0"),
      cleanParam(params.balance, "0"),
    ],
    buttonSuffix: params.bookingId,
  });
}

/**
 * Send the quote_proposal utility template via Meta Cloud API.
 * Body vars 1–6 + URL button suffix (lead id → /proposal/{id}).
 */
export async function sendQuoteProposalWhatsApp(
  phone: string,
  params: WhatsAppQuoteTemplateParams
): Promise<{ messageId: string | null }> {
  const templateName = process.env.WHATSAPP_QUOTE_TEMPLATE?.trim() || "quote_proposal";
  const language = process.env.WHATSAPP_QUOTE_TEMPLATE_LANG?.trim() || "en";

  return sendTemplateMessage({
    phone,
    templateName,
    language,
    bodyParameters: [
      cleanParam(params.customer, "Guest"),
      cleanParam(params.tourTitle, "Tour package"),
      cleanParam(params.destination),
      cleanParam(params.travelDates),
      cleanParam(params.vehicle, "Cab"),
      cleanParam(params.amount, "0"),
    ],
    buttonSuffix: params.leadId,
  });
}

/**
 * Send booking_confirmed to the customer (body 1–7 + invoice URL button).
 */
export async function sendBookingConfirmedWhatsApp(
  phone: string,
  params: WhatsAppBookingConfirmedParams
): Promise<{ messageId: string | null }> {
  const templateName =
    process.env.WHATSAPP_BOOKING_CONFIRMED_TEMPLATE?.trim() || "booking_confirmed";
  const language = process.env.WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_LANG?.trim() || "en";

  return sendTemplateMessage({
    phone,
    templateName,
    language,
    bodyParameters: [
      cleanParam(params.customer, "Guest"),
      cleanParam(params.bookingNo),
      cleanParam(params.tourPackage, "Tour package"),
      cleanParam(params.travelDates),
      cleanParam(params.pickup),
      cleanParam(params.driver, "To be assigned"),
      cleanParam(params.vehicle),
    ],
    buttonSuffix: params.bookingId,
  });
}

/**
 * Send driver_assignment to a driver (body 1–8, no button, no guest phone).
 */
export async function sendDriverAssignmentWhatsApp(
  phone: string,
  params: WhatsAppDriverAssignmentParams
): Promise<{ messageId: string | null }> {
  const templateName =
    process.env.WHATSAPP_DRIVER_ASSIGNMENT_TEMPLATE?.trim() || "driver_assignment";
  const language = process.env.WHATSAPP_DRIVER_ASSIGNMENT_TEMPLATE_LANG?.trim() || "en";

  return sendTemplateMessage({
    phone,
    templateName,
    language,
    bodyParameters: [
      cleanParam(params.driverName, "Driver"),
      cleanParam(params.bookingNo),
      cleanParam(params.guestName, "Guest"),
      cleanParam(params.tourPackage, "Tour package"),
      cleanParam(params.travelDates),
      cleanParam(params.pickup),
      cleanParam(params.dropoff),
      cleanParam(params.vehicle),
    ],
  });
}

/** Customer trip_reminder (3h before pickup). Body 1–7, no button. */
export async function sendTripReminderWhatsApp(
  phone: string,
  params: WhatsAppTripReminderParams
): Promise<{ messageId: string | null }> {
  const templateName =
    process.env.WHATSAPP_TRIP_REMINDER_TEMPLATE?.trim() || "trip_reminder";
  const language = process.env.WHATSAPP_TRIP_REMINDER_TEMPLATE_LANG?.trim() || "en";

  return sendTemplateMessage({
    phone,
    templateName,
    language,
    bodyParameters: [
      cleanParam(params.customer, "Guest"),
      cleanParam(params.bookingNo),
      cleanParam(params.tourPackage, "Tour package"),
      cleanParam(params.pickupTimeLabel),
      cleanParam(params.pickup),
      cleanParam(params.driver, "To be assigned"),
      cleanParam(params.vehicle),
    ],
  });
}

/** Driver trip reminder including guest phone. Body 1–9, no button. */
export async function sendDriverTripReminderWhatsApp(
  phone: string,
  params: WhatsAppDriverTripReminderParams
): Promise<{ messageId: string | null }> {
  const templateName =
    process.env.WHATSAPP_DRIVER_TRIP_REMINDER_TEMPLATE?.trim() || "driver_trip_reminder";
  const language = process.env.WHATSAPP_DRIVER_TRIP_REMINDER_TEMPLATE_LANG?.trim() || "en";

  return sendTemplateMessage({
    phone,
    templateName,
    language,
    bodyParameters: [
      cleanParam(params.driverName, "Driver"),
      cleanParam(params.bookingNo),
      cleanParam(params.guestName, "Guest"),
      cleanParam(params.guestPhone),
      cleanParam(params.tourPackage, "Tour package"),
      cleanParam(params.pickupTimeLabel),
      cleanParam(params.pickup),
      cleanParam(params.dropoff),
      cleanParam(params.vehicle),
    ],
  });
}

/** Customer payment_reminder (12h before pickup, unpaid balance). Body 1–5 + invoice button. */
export async function sendPaymentReminderWhatsApp(
  phone: string,
  params: WhatsAppPaymentReminderParams
): Promise<{ messageId: string | null }> {
  const templateName =
    process.env.WHATSAPP_PAYMENT_REMINDER_TEMPLATE?.trim() || "payment_reminder";
  const language = process.env.WHATSAPP_PAYMENT_REMINDER_TEMPLATE_LANG?.trim() || "en";

  return sendTemplateMessage({
    phone,
    templateName,
    language,
    bodyParameters: [
      cleanParam(params.customer, "Guest"),
      cleanParam(params.bookingNo),
      cleanParam(params.tourPackage, "Tour package"),
      cleanParam(params.pickupTimeLabel),
      cleanParam(params.balance, "0"),
    ],
    buttonSuffix: params.bookingId,
  });
}
