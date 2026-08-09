"use client";

import type { ComponentType } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  BedDouble,
  Car,
  Camera,
  Check,
  Compass,
  Download,
  MapPin,
  Phone,
  Printer,
  Mail,
  CalendarDays,
  Route,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";
import { buildProposalForLead } from "@/lib/proposal";
import { formatDisplayDate } from "@/components/crm/date-picker";

function inclusionIcon(item: string) {
  const lower = item.toLowerCase();
  if (lower.includes("hotel")) return BedDouble;
  if (lower.includes("cab") || lower.includes("car") || lower.includes("transport")) return Car;
  if (lower.includes("sight")) return Camera;
  return Sparkles;
}

function MetaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e8e1d4] bg-white/80 px-4 py-3 shadow-[0_1px_0_rgba(18,23,43,0.03)]">
      <div className="flex items-center gap-2 text-[#9a8668]">
        <Icon className="size-3.5" />
        <p className="font-mono-data text-[10px] uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-ink-text">{value}</p>
    </div>
  );
}

export default function ProposalPage() {
  const params = useParams<{ leadId: string }>();
  const search = useSearchParams();
  const { state } = useData();
  const lead = state.leads.find((l) => l.id === params.leadId);
  const amountParam = search.get("amount");
  const amount = amountParam ? Number(amountParam) : undefined;

  if (!lead) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ebe4d6] p-8">
        <p className="text-sm text-muted-foreground">Lead not found for this proposal.</p>
      </main>
    );
  }

  const proposal = buildProposalForLead(
    lead,
    Number.isFinite(amount) ? amount : undefined,
    state.itineraries
  );
  const travelWindow = proposal.returnDate
    ? `${formatDisplayDate(proposal.travelDate)} to ${formatDisplayDate(proposal.returnDate)}`
    : formatDisplayDate(proposal.travelDate);
  const paxLabel = `${proposal.adults} Adult${proposal.adults === 1 ? "" : "s"}${
    proposal.kids > 0 ? ` · ${proposal.kids} Kid${proposal.kids === 1 ? "" : "s"}` : ""
  }`;

  return (
    <div className="proposal-print min-h-screen bg-[#e8dfcf] text-ink-text print:bg-white">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#d9cbb3]/80 bg-[#f7f1e6]/90 px-4 py-3 backdrop-blur-md print:hidden">
        <div>
          <p className="text-sm font-semibold tracking-tight">Proposal preview</p>
          <p className="text-[11px] text-[#8a7a62]">Mahasu Travels · guest brochure</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" /> Print
          </Button>
          <Button variant="marigold" size="sm" onClick={() => window.print()}>
            <Download className="size-3.5" /> Download PDF
          </Button>
        </div>
      </div>

      <article className="proposal-sheet mx-auto my-6 max-w-[880px] overflow-hidden rounded-[28px] border border-[#d9cbb3] bg-[#fbf7f0] shadow-[0_24px_60px_rgba(62,42,18,0.14)] print:my-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="relative isolate overflow-hidden bg-[#101628] px-6 pb-16 pt-6 text-white sm:px-8 sm:pb-20 sm:pt-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(70% 80% at 88% 8%, rgba(245,165,36,0.28), transparent 55%), radial-gradient(55% 60% at 8% 90%, rgba(12,143,143,0.22), transparent 60%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />
          <Compass
            aria-hidden
            className="pointer-events-none absolute -right-8 top-8 size-44 rotate-12 text-white/8 sm:size-56"
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-marigold text-ink shadow-[0_8px_20px_rgba(245,165,36,0.35)]">
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
                <Phone className="size-3.5 text-marigold" /> +91 98170 00000
              </p>
              <p className="flex items-center gap-1.5 sm:justify-end">
                <Mail className="size-3.5 text-marigold" /> booking@mahasutravels.com
              </p>
            </div>
          </div>

          <div className="relative mt-10 max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 font-mono-data text-[11px] uppercase tracking-[0.18em] text-marigold">
              {proposal.nights}N / {proposal.days}D
              <span className="text-white/40">·</span>
              Starting ₹{proposal.startingFrom.toLocaleString("en-IN")}
            </p>
            <h1 className="mt-4 font-display text-[1.85rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.45rem]">
              {proposal.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              {proposal.subtitle}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {proposal.inclusions.slice(0, 3).map((item) => {
                const Icon = inclusionIcon(item);
                return (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs text-white/90"
                  >
                    <Icon className="size-3.5 text-marigold" />
                    {item}
                  </span>
                );
              })}
            </div>
          </div>

          <svg
            aria-hidden
            viewBox="0 0 880 150"
            className="pointer-events-none absolute inset-x-0 bottom-0 w-full text-[#fbf7f0]"
            preserveAspectRatio="none"
          >
            <path
              fill="currentColor"
              d="M0 150V78l70-38 80 46 90-62 88 48 96-54 78 42 92-50 86 40L880 28v122H0Z"
              opacity="0.18"
            />
            <path
              fill="currentColor"
              d="M0 150V102l92-28 74 34 86-48 94 40 78-30 88 36 84-42 92 28L880 72v78H0Z"
            />
          </svg>

          <div className="absolute bottom-5 right-6 z-10 sm:bottom-6 sm:right-8">
            <div className="rounded-[22px] border border-marigold/40 bg-marigold px-4 py-3 text-ink shadow-[0_12px_30px_rgba(245,165,36,0.35)] sm:px-5">
              <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-marigold-ink/80">
                Quoted for this guest
              </p>
              <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                ₹{proposal.quoteAmount.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </header>

        <section className="px-6 pb-2 pt-8 sm:px-8">
          <div className="rounded-[24px] border border-[#eadfcb] bg-[linear-gradient(135deg,#fffaf3,#f6efe3)] px-5 py-5 sm:px-6">
            <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-[#9a8668]">
              Prepared exclusively for
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-text sm:text-3xl">
                  {proposal.customer}
                </h2>
                <p className="mt-1 text-sm text-[#7a6b55]">
                  {proposal.leadId} · Planned with {proposal.agent}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-ink-text">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#eadfcb]">
                  <Phone className="size-3.5 text-marigold-ink" />
                  {proposal.phone || "—"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#eadfcb]">
                  <Mail className="size-3.5 text-marigold-ink" />
                  {proposal.email || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetaTile icon={Route} label="Package" value={proposal.tourPackage} />
            <MetaTile icon={MapPin} label="Pickup → Drop" value={`${proposal.pickup} → ${proposal.dropoff}`} />
            <MetaTile icon={CalendarDays} label="Travel dates" value={travelWindow} />
            <MetaTile icon={Car} label="Cab · Pax" value={`${proposal.cabType} · ${paxLabel}`} />
          </div>
        </section>

        <section className="px-6 py-7 sm:px-8">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">Tour overview</h2>
            <span className="h-px flex-1 bg-[linear-gradient(90deg,#d9cbb3,transparent)]" />
          </div>
          <div
            className="proposal-copy mt-3 max-w-none text-[15px] leading-relaxed text-[#5c5346]"
            dangerouslySetInnerHTML={{ __html: proposal.overview }}
          />
          {proposal.tourPlan ? (
            <blockquote className="mt-5 rounded-2xl border-l-4 border-marigold bg-white/70 px-4 py-3.5 text-sm text-ink-text shadow-[inset_0_0_0_1px_#eadfcb]">
              <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-[#9a8668]">
                Guest note
              </p>
              <p className="mt-1 leading-relaxed">{proposal.tourPlan}</p>
            </blockquote>
          ) : null}
        </section>

        <section className="px-6 pb-8 sm:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Day-wise itinerary</h2>
              <p className="mt-1 text-xs text-[#8a7a62]">
                {proposal.isCustomized
                  ? "Customized for this guest · master template unchanged"
                  : "From reusable itinerary template"}
              </p>
            </div>
            <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-[#9a8668]">
              {proposal.itinerary.length} days on the road
            </p>
          </div>

          <ol className="relative space-y-0">
            <div
              aria-hidden
              className="absolute bottom-6 left-[19px] top-6 w-px bg-[repeating-linear-gradient(to_bottom,#d9cbb3_0_6px,transparent_6px_12px)] sm:left-[23px]"
            />
            {proposal.itinerary.map((stop, index) => (
              <li key={stop.day} className="relative flex gap-4 pb-5 last:pb-0 sm:gap-5">
                <div className="relative z-[1] mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#101628] font-display text-sm font-semibold text-marigold shadow-[0_0_0_4px_#fbf7f0] sm:size-12 sm:text-base">
                  {stop.day}
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-[#eadfcb] bg-white px-4 py-3.5 sm:px-5">
                  <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-[#9a8668]">
                    Day {stop.day}
                    {index === 0 ? " · Start" : index === proposal.itinerary.length - 1 ? " · Return" : ""}
                  </p>
                  <p className="mt-1 font-display text-base font-semibold text-ink-text">{stop.title}</p>
                  <div
                    className="proposal-copy mt-1.5 text-sm leading-relaxed text-[#5c5346]"
                    dangerouslySetInnerHTML={{ __html: stop.detail }}
                  />
                  {(stop.hotelName || stop.hotelId) && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1.5 text-xs text-teal">
                      <BedDouble className="size-3.5 shrink-0" />
                      <span className="font-medium">Overnight</span>
                      <span>{stop.hotelName || stop.hotelId}</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 px-6 pb-8 sm:grid-cols-[1.1fr_0.9fr] sm:px-8">
          <div className="rounded-[24px] border border-[#eadfcb] bg-white px-5 py-5">
            <h2 className="font-display text-lg font-semibold tracking-tight">What’s included</h2>
            <ul className="mt-4 space-y-2.5">
              {proposal.inclusions.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#5c5346]">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal">
                    <Check className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-[24px] bg-[#101628] px-5 py-5 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-marigold/20 blur-2xl"
            />
            <div
              aria-hidden
              className="absolute left-0 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fbf7f0]"
            />
            <div
              aria-hidden
              className="absolute right-0 top-1/2 size-6 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fbf7f0]"
            />
            <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-marigold">
              Travel voucher
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold">Quote summary</h2>
            <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-marigold">
              ₹{proposal.quoteAmount.toLocaleString("en-IN")}
            </p>
            <div className="mt-4 space-y-1.5 border-t border-dashed border-white/15 pt-4 text-xs leading-relaxed text-white/70">
              <p>Cab · {proposal.cabType}</p>
              <p>
                Duration · {proposal.days} days ({proposal.nights} nights)
              </p>
              <p>Guests · {paxLabel}</p>
              <p>Payment · 40% advance · balance before trip</p>
              <p>Cancellation · free up to 48h before travel</p>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eadfcb] bg-[#f3eadc] px-6 py-4 text-[11px] text-[#8a7a62] sm:px-8">
          <p>Mahasu Travels · Shimla · Manali · Spiti · private hill cabs</p>
          <p>
            Prepared for {proposal.customer} · {proposal.leadId}
          </p>
        </footer>
      </article>
    </div>
  );
}
