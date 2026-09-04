"use client";

import * as React from "react";
import { ExternalLink, Loader2, Send } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/crm/status-badge";
import { formatDisplayDate } from "@/components/crm/date-picker";
import { Booking } from "@/lib/data";
import { sendBookingInvoiceApi } from "@/lib/bookings-api";
import { useData } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { isValidMobilePhone } from "@/lib/lead-utils";

export function BookingInvoiceDrawer({
  booking,
  open,
  onOpenChange,
}: {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { refreshBookings } = useData();
  const { toast } = useToast();
  const [sending, setSending] = React.useState(false);

  const invoiceHref = booking ? `/invoice/${booking.id}?preview=1` : "";
  const phoneOk = booking?.phone ? isValidMobilePhone(booking.phone) : false;

  async function handleSend() {
    if (!booking) return;
    if (!booking.phone?.trim()) {
      toast({
        variant: "error",
        title: "Phone required",
        description: "Add a guest phone on the booking before sending the invoice.",
      });
      return;
    }
    if (!phoneOk) {
      toast({
        variant: "error",
        title: "Invalid phone",
        description: "Enter a valid 10-digit Indian mobile number on the booking.",
      });
      return;
    }

    setSending(true);
    try {
      await sendBookingInvoiceApi(booking.id);
      await refreshBookings();
      toast({
        variant: "success",
        title: "Invoice sent",
        description: `WhatsApp message sent to ${booking.phone}.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not send invoice",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  const travelLabel = booking
    ? [
        booking.travelDate ? formatDisplayDate(booking.travelDate) : "",
        booking.returnDate ? formatDisplayDate(booking.returnDate) : "",
      ]
        .filter(Boolean)
        .join(" → ")
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Invoice</SheetTitle>
          {booking ? (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-text">{booking.customer}</span>
                <StatusBadge status={booking.status} />
              </div>
              <SheetDescription>
                {booking.bookingNo || booking.id} · Preview or send on WhatsApp
              </SheetDescription>
            </>
          ) : null}
        </SheetHeader>

        <SheetBody className="flex-1 space-y-4 overflow-y-auto">
          {!booking ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No booking selected.</p>
          ) : (
            <>
              <div className="rounded-md border border-border p-3 text-sm">
                <dl className="space-y-2.5">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-medium text-ink-text">{booking.phone || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Package</dt>
                    <dd className="max-w-[14rem] text-right font-medium text-ink-text">
                      {booking.tourPackage || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Travel</dt>
                    <dd className="font-medium text-ink-text">{travelLabel || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="font-medium text-ink-text">
                      ₹{booking.total.toLocaleString("en-IN")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Advance</dt>
                    <dd className="font-medium text-ink-text">
                      ₹{booking.advance.toLocaleString("en-IN")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Balance</dt>
                    <dd className="font-medium text-ink-text">
                      ₹{booking.balance.toLocaleString("en-IN")}
                    </dd>
                  </div>
                </dl>
              </div>

              <p className="text-xs text-muted-foreground">
                Preview opens the printable invoice. Send uses your Meta WhatsApp template
                <span className="font-mono"> booking_invoice</span> with a link to this invoice.
              </p>
            </>
          )}
        </SheetBody>

        <SheetFooter className="sm:justify-between">
          <Button asChild variant="outline" disabled={!booking}>
            <a href={invoiceHref} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" /> Preview invoice
            </a>
          </Button>
          <Button
            variant="marigold"
            disabled={!booking || sending || !phoneOk}
            onClick={() => void handleSend()}
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send on WhatsApp
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}