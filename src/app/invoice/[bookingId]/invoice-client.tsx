"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BedDouble, Download, Loader2, Phone, Printer } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/components/crm/date-picker";
import type { BookingApi } from "@/lib/bookings-api";
import {
  DEFAULT_COMPANY_CONTACT_NAME,
  DEFAULT_COMPANY_CONTACT_PHONE,
} from "@/lib/quote-defaults";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-[#eadfcb] py-2.5 last:border-b-0 sm:grid-cols-[11rem_1fr]">
      <p className="font-mono-data text-[10px] uppercase tracking-[0.14em] text-[#9a8668]">
        {label}
      </p>
      <p className="text-sm font-medium text-[#12172b]">{value || "—"}</p>
    </div>
  );
}

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function InvoicePage() {
  const params = useParams<{ bookingId: string }>();
  const search = useSearchParams();
  const preview = search.get("preview") === "1";
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [booking, setBooking] = React.useState<BookingApi | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetch(`/api/invoice/${params.bookingId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || "Could not load this invoice.");
        }
        return res.json() as Promise<{ booking: BookingApi }>;
      })
      .then((data) => {
        if (!cancelled) setBooking(data.booking);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load this invoice.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.bookingId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ebe4d6] p-8">
        <p className="inline-flex items-center gap-2 text-sm text-[#5c5346]">
          <Loader2 className="size-4 animate-spin" /> Loading invoice…
        </p>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ebe4d6] p-8">
        <p className="max-w-md text-center text-sm text-[#5c5346]">
          {error || "Invoice not found."}
        </p>
      </main>
    );
  }

  const hotels = booking.hotels?.length
    ? booking.hotels
    : booking.hotel
      ? [booking.hotel]
      : [];
  const paxLabel = `${booking.adults} Adult${booking.adults === 1 ? "" : "s"}${
    booking.kids > 0 ? ` · ${booking.kids} Kid${booking.kids === 1 ? "" : "s"}` : ""
  }`;
  const travelLabel = [
    booking.travel_date ? formatDisplayDate(booking.travel_date) : "",
    booking.return_date ? formatDisplayDate(booking.return_date) : "",
  ]
    .filter(Boolean)
    .join(" → ");

  return (
    <div className="proposal-print min-h-screen bg-[#e8dfcf] text-[#12172b] print:bg-white">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#d9cbb3]/80 bg-[#f7f1e6]/90 px-4 py-3 backdrop-blur-md print:hidden">
        <div>
          <p className="text-sm font-semibold tracking-tight text-[#12172b]">Invoice preview</p>
          <p className="text-[11px] text-[#8a7a62]">
            Mahasu Travels · {booking.status}
            {preview ? " · CRM preview" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#d9cbb3] bg-white text-[#12172b] hover:bg-[#f3eadc]"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" /> Print
          </Button>
          <Button variant="marigold" size="sm" onClick={() => window.print()}>
            <Download className="size-3.5" /> Download PDF
          </Button>
        </div>
      </div>

      <article className="proposal-sheet mx-auto my-6 max-w-[880px] overflow-hidden rounded-[28px] border border-[#d9cbb3] bg-[#fbf7f0] shadow-[0_24px_60px_rgba(62,42,18,0.14)] print:my-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="proposal-break relative isolate overflow-hidden bg-[#101628] px-6 pb-10 pt-6 text-white sm:px-8 sm:pb-12 sm:pt-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(70% 80% at 88% 8%, rgba(245,165,36,0.28), transparent 55%), radial-gradient(55% 60% at 8% 90%, rgba(12,143,143,0.22), transparent 60%)",
            }}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative size-12 overflow-hidden rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.25)]">
                <Image
                  src="/brand/mahasu-logo.png"
                  alt="Mahasu Travels"
                  width={48}
                  height={48}
                  className="size-12 object-cover"
                  priority
                />
              </div>
              <div>
                <p className="font-display text-xl font-semibold tracking-tight">Mahasu Travels</p>
                <p className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-marigold/90">
                  Booking invoice
                </p>
              </div>
            </div>
            <div className="space-y-1 text-xs text-white/75 sm:text-right">
              <p className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 text-marigold" />
                {DEFAULT_COMPANY_CONTACT_PHONE}
              </p>
              <p>{DEFAULT_COMPANY_CONTACT_NAME}</p>
            </div>
          </div>

          <div className="relative mt-8 max-w-2xl">
            <p className="text-sm text-white/70">Tax invoice / booking receipt</p>
            <h1 className="mt-3 font-display text-[1.85rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.35rem]">
              {booking.tour_package || "Tour booking"}
            </h1>
            <p className="mt-2 text-sm text-white/70 sm:text-base">
              {booking.booking_no}
              {booking.created_at
                ? ` · Issued ${formatDisplayDate(booking.created_at.slice(0, 10))}`
                : ""}
            </p>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-3">
            <div className="inline-flex rounded-[18px] border border-marigold/40 bg-marigold px-4 py-3 text-[#12172b]">
              <div>
                <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-[#7a4c05]/80">
                  Total amount
                </p>
                <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {money(booking.total)}
                </p>
              </div>
            </div>
            <div className="inline-flex rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 text-white">
              <div>
                <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-white/60">
                  Balance due
                </p>
                <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {money(booking.balance)}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="proposal-break px-6 py-7 sm:px-8">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">Guest details</h2>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,#d9cbb3,transparent)]" />
          </div>
          <div className="rounded-[20px] border border-[#eadfcb] bg-white px-4 sm:px-5">
            <SummaryRow label="Guest name" value={booking.customer} />
            <SummaryRow label="Phone" value={booking.phone} />
            <SummaryRow label="Email" value={booking.email} />
            <SummaryRow label="City" value={booking.city} />
            <SummaryRow label="Persons" value={paxLabel} />
          </div>
        </section>

        <section className="proposal-break px-6 pb-8 sm:px-8">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">Trip details</h2>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,#d9cbb3,transparent)]" />
          </div>
          <div className="rounded-[20px] border border-[#eadfcb] bg-white px-4 sm:px-5">
            <SummaryRow label="Package" value={booking.tour_package} />
            <SummaryRow label="Travel dates" value={travelLabel || "—"} />
            <SummaryRow
              label="Duration"
              value={booking.days > 0 ? `${booking.days} day${booking.days === 1 ? "" : "s"}` : "—"}
            />
            <SummaryRow label="Pick-up" value={booking.pickup} />
            <SummaryRow label="Drop-off" value={booking.dropoff} />
            <SummaryRow label="Vehicle" value={booking.cab_type} />
            {booking.tour_plan ? (
              <SummaryRow label="Tour plan" value={booking.tour_plan} />
            ) : null}
          </div>
        </section>

        {hotels.length > 0 ? (
          <section className="proposal-break px-6 pb-8 sm:px-8">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight">Hotel stays</h2>
              <span className="h-px flex-1 bg-[linear-gradient(90deg,#d9cbb3,transparent)]" />
            </div>
            <ul className="space-y-3">
              {hotels.map((h, i) => (
                <li
                  key={`${h.hotelName}-${i}`}
                  className="rounded-2xl border border-[#eadfcb] bg-white px-4 py-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="inline-flex items-center gap-1.5 font-display text-base font-semibold">
                        <BedDouble className="size-4 text-[#0c8f8f]" />
                        {h.hotelName}
                      </p>
                      {h.address ? (
                        <p className="mt-1 text-xs text-[#8a7a62]">{h.address}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-[#5c5346]">
                        {[
                          h.roomType,
                          h.roomCount ? `${h.roomCount} room${h.roomCount === 1 ? "" : "s"}` : "",
                          h.checkIn ? `In ${formatDisplayDate(h.checkIn)}` : "",
                          h.checkOut ? `Out ${formatDisplayDate(h.checkOut)}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <p className="font-mono-data text-sm font-semibold">{money(h.amount || 0)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="proposal-break px-6 pb-10 sm:px-8">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">Payment summary</h2>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,#d9cbb3,transparent)]" />
          </div>
          <div className="rounded-[20px] border border-[#eadfcb] bg-white px-4 sm:px-5">
            <SummaryRow label="Status" value={booking.status} />
            <SummaryRow label="Payment mode" value={booking.payment_mode || "—"} />
            <SummaryRow label="Total" value={money(booking.total)} />
            <SummaryRow label="Advance paid" value={money(booking.advance)} />
            <SummaryRow label="Balance due" value={money(booking.balance)} />
            {booking.agent ? <SummaryRow label="Agent" value={booking.agent} /> : null}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#8a7a62]">
            This invoice confirms your booking with Mahasu Travels. For changes or payment support,
            contact {DEFAULT_COMPANY_CONTACT_PHONE}.
          </p>
        </section>
      </article>
    </div>
  );
}
