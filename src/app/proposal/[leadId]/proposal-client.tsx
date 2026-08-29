"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  BedDouble,
  Download,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Printer,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/components/crm/date-picker";
import { fetchProposalQuote } from "@/lib/lead-quotes-api";
import type { LeadQuoteDto } from "@/lib/quote-defaults";
import {
  QUOTE_PDF_AMENDMENT_POLICY,
  QUOTE_PDF_BOOKING_INTRO,
  QUOTE_PDF_CANCELLATION_POLICY,
  QUOTE_PDF_CLOSING,
  QUOTE_PDF_IMPORTANT_NOTES,
  QUOTE_PDF_PAYMENT_METHODS,
  QUOTE_PDF_PAYMENT_SCHEDULE,
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

export default function ProposalPage() {
  const params = useParams<{ leadId: string }>();
  const search = useSearchParams();
  const preview = search.get("preview") === "1";
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [quote, setQuote] = React.useState<LeadQuoteDto | null>(null);
  const [leadMeta, setLeadMeta] = React.useState<{
    lead_no: string;
    name: string;
    assigned_to: { id: string; name: string } | null;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetchProposalQuote(params.leadId, { preview })
      .then((data) => {
        if (cancelled) return;
        setLeadMeta(data.lead);
        setQuote(data.quote);
        if (!data.quote) {
          setError(
            preview
              ? "No saved quote yet. Open Quote from Leads, save a draft, then preview."
              : "No sent quote is available for this lead yet."
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this proposal.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.leadId, preview]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ebe4d6] p-8">
        <p className="inline-flex items-center gap-2 text-sm text-[#5c5346]">
          <Loader2 className="size-4 animate-spin" /> Loading proposal…
        </p>
      </main>
    );
  }

  if (error || !quote || !leadMeta) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ebe4d6] p-8">
        <p className="max-w-md text-center text-sm text-[#5c5346]">
          {error || "Proposal not found."}
        </p>
      </main>
    );
  }

  const paxLabel = `${quote.adults} Adult${quote.adults === 1 ? "" : "s"}${
    quote.kids > 0
      ? ` · ${quote.kids} Kid${quote.kids === 1 ? "" : "s"}${quote.kids_note ? ` (${quote.kids_note})` : ""}`
      : ""
  }`;

  return (
    <div className="proposal-print min-h-screen bg-[#e8dfcf] text-[#12172b] print:bg-white">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#d9cbb3]/80 bg-[#f7f1e6]/90 px-4 py-3 backdrop-blur-md print:hidden">
        <div>
          <p className="text-sm font-semibold tracking-tight text-[#12172b]">Proposal preview</p>
          <p className="text-[11px] text-[#8a7a62]">
            Mahasu Travels · {quote.status}
            {preview ? " · draft preview" : ""}
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
        {/* Cover */}
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
              <div className="flex size-12 items-center justify-center rounded-2xl bg-marigold text-[#12172b] shadow-[0_8px_20px_rgba(245,165,36,0.35)]">
                <Compass className="size-6" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold tracking-tight">Mahasu Travels</p>
                <p className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-marigold/90">
                  Himalayan tour proposal
                </p>
              </div>
            </div>
            <div className="space-y-1 text-xs text-white/75 sm:text-right">
              <p className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 text-marigold" />
                {quote.company_contact_phone || "+91 98170 00000"}
              </p>
              <p>{quote.company_contact_name || "Booking desk"}</p>
            </div>
          </div>

          <div className="relative mt-8 max-w-2xl">
            <p className="text-sm text-white/70">{quote.greeting || "Dear Sir / Ma'am,"}</p>
            <h1 className="mt-3 font-display text-[1.85rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.35rem]">
              {quote.tour_title}
            </h1>
            <p className="mt-2 text-sm text-white/70 sm:text-base">{quote.tour_subtitle}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/65">{quote.intro_text}</p>
          </div>

          <div className="relative mt-6 inline-flex rounded-[18px] border border-marigold/40 bg-marigold px-4 py-3 text-[#12172b]">
            <div>
              <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-[#7a4c05]/80">
                Package total
              </p>
              <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                ₹{quote.amount.toLocaleString("en-IN")}
              </p>
              {quote.amount_note ? (
                <p className="mt-1 max-w-xs text-[11px] text-[#7a4c05]/90">{quote.amount_note}</p>
              ) : null}
            </div>
          </div>
        </header>

        {/* Guest summary */}
        <section className="proposal-break px-6 py-7 sm:px-8">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">Guest summary</h2>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,#d9cbb3,transparent)]" />
          </div>
          <div className="rounded-[20px] border border-[#eadfcb] bg-white px-4 sm:px-5">
            <SummaryRow label="Guest name" value={quote.guest_name} />
            <SummaryRow label="Destination" value={quote.destination} />
            <SummaryRow label="Contact no." value={quote.guest_phone} />
            <SummaryRow label="Email" value={quote.guest_email} />
            <SummaryRow label="No of persons" value={paxLabel} />
            <SummaryRow
              label="Travel date"
              value={quote.travel_date ? formatDisplayDate(quote.travel_date) : "—"}
            />
            <SummaryRow
              label="Return date"
              value={quote.return_date ? formatDisplayDate(quote.return_date) : "—"}
            />
            <SummaryRow label="Duration" value={quote.duration_label} />
            <SummaryRow label="Pick-up" value={quote.pickup} />
            <SummaryRow label="Drop-off" value={quote.dropoff} />
            <SummaryRow label="Vehicle" value={quote.vehicle_label} />
          </div>
          <p className="mt-3 text-xs text-[#8a7a62]">
            {leadMeta.lead_no}
            {leadMeta.assigned_to ? ` · Planned with ${leadMeta.assigned_to.name}` : ""}
          </p>
        </section>

        {/* Itinerary */}
        <section className="proposal-break px-6 pb-8 sm:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Tour itinerary</h2>
              <p className="mt-1 text-xs text-[#8a7a62]">Day-wise plan for this guest</p>
            </div>
            <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-[#9a8668]">
              {quote.days.length} days
            </p>
          </div>

          <ol className="space-y-4">
            {quote.days.map((stop) => (
              <li
                key={stop.day}
                className="overflow-hidden rounded-2xl border border-[#eadfcb] bg-white"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-[#eadfcb] bg-[#101628] px-4 py-2.5 text-white">
                  <span className="rounded-full bg-marigold px-2.5 py-0.5 font-mono-data text-[10px] font-semibold uppercase tracking-wide text-[#12172b]">
                    Day {String(stop.day).padStart(2, "0")}
                  </span>
                  {stop.date ? (
                    <span className="text-xs text-white/70">{formatDisplayDate(stop.date)}</span>
                  ) : null}
                  <span className="font-display text-sm font-semibold sm:text-base">{stop.title}</span>
                </div>
                <div className="space-y-3 px-4 py-3.5">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {stop.distance ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f3eadc] px-2.5 py-1 text-[#7a4c05]">
                        <MapPin className="size-3" /> {stop.distance}
                      </span>
                    ) : null}
                    {stop.stay ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#e0f5f3] px-2.5 py-1 text-[#0c8f8f]">
                        <BedDouble className="size-3" /> Stay · {stop.stay}
                      </span>
                    ) : null}
                  </div>
                  {stop.detail ? (
                    <p className="text-sm leading-relaxed text-[#5c5346]">{stop.detail}</p>
                  ) : null}
                  {stop.highlights.length > 0 ? (
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {stop.highlights.map((h) => (
                        <li
                          key={h}
                          className="rounded-lg bg-[#f7f1e6] px-2.5 py-1.5 text-xs text-[#12172b]"
                        >
                          · {h}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {stop.overnight ? (
                    <p className="text-xs font-medium text-[#0c8f8f]">{stop.overnight}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Inclusions / exclusions */}
        <section className="proposal-break grid gap-4 px-6 pb-8 sm:grid-cols-2 sm:px-8">
          <div className="rounded-2xl border border-[#eadfcb] bg-white p-4">
            <h3 className="font-display text-base font-semibold">Inclusions</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-[#5c5346]">
              {quote.inclusions.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
              {quote.inclusions.length === 0 ? <li>—</li> : null}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#eadfcb] bg-white p-4">
            <h3 className="font-display text-base font-semibold">Exclusions</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-[#5c5346]">
              {quote.exclusions.map((item) => (
                <li key={item}>– {item}</li>
              ))}
              {quote.exclusions.length === 0 ? <li>—</li> : null}
            </ul>
          </div>
        </section>

        {/* Hotel details — dynamic */}
        {(quote.hotels?.length ?? 0) > 0 ? (
          <section className="proposal-break px-6 pb-8 sm:px-8">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Hotel details and rates
              </h2>
              <span className="h-px flex-1 bg-[linear-gradient(90deg,#d9cbb3,transparent)]" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#eadfcb] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#101628] text-[10px] uppercase tracking-[0.12em] text-marigold">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Location</th>
                    <th className="px-3 py-2.5 font-medium">Hotel</th>
                    <th className="px-3 py-2.5 font-medium">Category</th>
                    <th className="px-3 py-2.5 font-medium">Nights</th>
                    <th className="px-3 py-2.5 font-medium">Rooms</th>
                    <th className="px-3 py-2.5 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.hotels.map((h, i) => (
                    <tr key={`${h.hotel_name}-${i}`} className="border-t border-[#eadfcb]">
                      <td className="px-3 py-2.5 text-[#5c5346]">{h.location || "—"}</td>
                      <td className="px-3 py-2.5 font-medium text-[#12172b]">
                        {h.hotel_name || "—"}
                        {h.notes ? (
                          <span className="mt-0.5 block text-[11px] font-normal text-[#8a7a62]">
                            {h.notes}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-[#5c5346]">{h.category || "—"}</td>
                      <td className="px-3 py-2.5 text-[#5c5346]">{h.nights || "—"}</td>
                      <td className="px-3 py-2.5 text-[#5c5346]">{h.rooms || "—"}</td>
                      <td className="px-3 py-2.5 font-medium text-[#12172b]">{h.rate || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* Amount */}
        <section className="proposal-break px-6 pb-6 sm:px-8">
          <div className="rounded-[24px] bg-[#101628] px-5 py-5 text-white">
            <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-marigold">
              Quote amount
            </p>
            <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-marigold">
              ₹{quote.amount.toLocaleString("en-IN")}
            </p>
            {quote.amount_note ? (
              <p className="mt-2 text-sm text-white/70">{quote.amount_note}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-dashed border-white/15 pt-4 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 text-marigold" />
                {quote.company_contact_phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 text-marigold" />
                booking@mahasutravels.com
              </span>
            </div>
          </div>
        </section>

        {/* Important notes — static */}
        <section className="proposal-break px-6 pb-6 sm:px-8">
          <h2 className="font-display text-lg font-semibold tracking-tight text-[#12172b]">
            Important note
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#5c5346]">
            {QUOTE_PDF_IMPORTANT_NOTES.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-marigold" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Booking procedure — static */}
        <section className="proposal-break px-6 pb-6 sm:px-8">
          <h2 className="font-display text-lg font-semibold tracking-tight text-[#12172b]">
            Booking procedure
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#5c5346]">{QUOTE_PDF_BOOKING_INTRO}</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#eadfcb] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-marigold/90 text-[10px] uppercase tracking-[0.12em] text-[#7a4c05]">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Payment item</th>
                  <th className="px-3 py-2.5 font-semibold">Percentage</th>
                  <th className="px-3 py-2.5 font-semibold">Date of payment</th>
                </tr>
              </thead>
              <tbody>
                {QUOTE_PDF_PAYMENT_SCHEDULE.map((row) => (
                  <tr key={row.item} className="border-t border-[#eadfcb]">
                    <td className="bg-[#fdf1da]/60 px-3 py-2.5 font-medium text-[#7a4c05]">
                      {row.item}
                    </td>
                    <td className="bg-[#fdf1da]/60 px-3 py-2.5 font-semibold text-[#12172b]">
                      {row.percentage}
                    </td>
                    <td className="px-3 py-2.5 text-[#5c5346]">{row.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-5 font-display text-base font-semibold text-[#12172b]">
            Process of making advance payment
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#eadfcb] bg-white p-3">
              <p className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-[#9a8668]">
                {QUOTE_PDF_PAYMENT_METHODS.upiTitle}
              </p>
              <p className="mt-2 text-sm font-medium text-[#12172b]">
                {QUOTE_PDF_PAYMENT_METHODS.upiDetail}
              </p>
            </div>
            <div className="rounded-2xl border border-[#eadfcb] bg-white p-3">
              <p className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-[#9a8668]">
                {QUOTE_PDF_PAYMENT_METHODS.bankTitle}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs leading-relaxed text-[#5c5346]">
                {QUOTE_PDF_PAYMENT_METHODS.bankLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#eadfcb] bg-[#f7f1e6] p-3">
              <p className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-[#9a8668]">
                UPI scanner
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#5c5346]">
                {QUOTE_PDF_PAYMENT_METHODS.scannerNote}
              </p>
            </div>
          </div>
        </section>

        {/* Cancellation — static */}
        <section className="proposal-break px-6 pb-6 sm:px-8">
          <h2 className="font-display text-lg font-semibold tracking-tight text-[#12172b]">
            Cancellation &amp; refund policy
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#5c5346]">
            {QUOTE_PDF_CANCELLATION_POLICY.map((line) => (
              <li key={line.slice(0, 48)} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#101628]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Amendment — static */}
        <section className="proposal-break px-6 pb-6 sm:px-8">
          <h2 className="font-display text-lg font-semibold tracking-tight text-[#12172b]">
            Amendment policy (prepone &amp; postpone)
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#5c5346]">
            {QUOTE_PDF_AMENDMENT_POLICY.map((line) => (
              <li key={line.slice(0, 48)} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[#101628]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Closing — static */}
        <section className="proposal-break px-6 pb-8 sm:px-8">
          <div className="rounded-2xl border border-[#eadfcb] bg-[#f3eadc]/70 px-5 py-5 text-sm text-[#12172b]">
            <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-[#9a8668]">
              {QUOTE_PDF_CLOSING.regards}
            </p>
            <p className="mt-2 font-display text-lg font-semibold">{QUOTE_PDF_CLOSING.name}</p>
            <p className="mt-1 text-xs text-[#5c5346]">
              Mob. No. {QUOTE_PDF_CLOSING.mobiles.join(", ")}
            </p>
            <p className="mt-1 text-xs text-[#5c5346]">{QUOTE_PDF_CLOSING.emergency}</p>
            <p className="mt-3 text-xs text-[#5c5346]">
              Mail ID: {QUOTE_PDF_CLOSING.email}
              <br />
              Website: {QUOTE_PDF_CLOSING.website}
              <br />
              Address: {QUOTE_PDF_CLOSING.address}
            </p>
            <p className="mt-4 text-center font-mono-data text-[10px] uppercase tracking-[0.14em] text-[#7a4c05]">
              {QUOTE_PDF_CLOSING.thankYou}
            </p>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eadfcb] bg-[#f3eadc] px-6 py-4 text-[11px] text-[#8a7a62] sm:px-8">
          <p>Mahasu Travels · Shimla · Manali · Spiti · private hill cabs</p>
          <p>
            Prepared for {quote.guest_name} · {leadMeta.lead_no}
          </p>
        </footer>
      </article>
    </div>
  );
}
