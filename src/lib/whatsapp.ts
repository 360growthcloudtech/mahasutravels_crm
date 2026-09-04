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

/**
 * Send the booking_invoice utility template via Meta Cloud API.
 * Body vars 1–7 + URL button suffix (booking id).
 */
export async function sendBookingInvoiceWhatsApp(
  phone: string,
  params: WhatsAppInvoiceTemplateParams
): Promise<{ messageId: string | null }> {
  const token = requireEnv("WHATSAPP_TOKEN");
  const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = process.env.WHATSAPP_INVOICE_TEMPLATE?.trim() || "booking_invoice";
  const language = process.env.WHATSAPP_INVOICE_TEMPLATE_LANG?.trim() || "en";

  const to = toWhatsAppRecipient(phone);
  if (!to) {
    throw new WhatsAppSendError("Guest phone is not a valid Indian mobile number", 400);
  }

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: cleanParam(params.customer, "Guest") },
            { type: "text", text: cleanParam(params.bookingNo) },
            { type: "text", text: cleanParam(params.tourPackage, "Tour package") },
            { type: "text", text: cleanParam(params.travelDates) },
            { type: "text", text: cleanParam(params.total, "0") },
            { type: "text", text: cleanParam(params.advance, "0") },
            { type: "text", text: cleanParam(params.balance, "0") },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: cleanParam(params.bookingId) }],
        },
      ],
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
