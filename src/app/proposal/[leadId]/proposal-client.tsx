"use client";

import { useParams, useSearchParams } from "next/navigation";
import {
  BedDouble,
  Car,
  Camera,
  Compass,
  Download,
  MapPin,
  Phone,
  Printer,
  Mail,
  Users,
  CalendarDays,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/lib/store";
import { buildProposalForLead } from "@/lib/proposal";
import { formatDisplayDate } from "@/components/crm/date-picker";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-border-soft py-2 last:border-b-0">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-marigold-ink" />
      <div className="min-w-0">
        <p className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-slate-soft">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-ink-text">{value}</p>
      </div>
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
      <main className="flex min-h-screen items-center justify-center bg-paper p-8">
        <p className="text-sm text-muted-foreground">Lead not found for this proposal.</p>
      </main>
    );
  }

  const proposal = buildProposalForLead(lead, Number.isFinite(amount) ? amount : undefined);
  const travelWindow = proposal.returnDate
    ? `${formatDisplayDate(proposal.travelDate)} to ${formatDisplayDate(proposal.returnDate)}`
    : formatDisplayDate(proposal.travelDate);
  const paxLabel = `${proposal.adults} Adult${proposal.adults === 1 ? "" : "s"}${
    proposal.kids > 0 ? ` · ${proposal.kids} Kid${proposal.kids === 1 ? "" : "s"}` : ""
  }`;

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-ink-text print:bg-white">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white px-4 py-3 print:hidden">
        <p className="text-sm font-medium">PDF proposal preview · Dummy brochure</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" /> Print
          </Button>
          <Button variant="marigold" size="sm" onClick={() => window.print()}>
            <Download className="size-3.5" /> Download PDF
          </Button>
        </div>
      </div>

      <article className="mx-auto my-6 max-w-[900px] overflow-hidden rounded-xl border border-border bg-white shadow-[0_8px_24px_rgba(18,23,43,0.06)] print:my-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-marigold text-ink">
              <Compass className="size-5" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-ink-text">
                Mahasu Travels
              </p>
              <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-slate-soft">
                Tour proposal
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate">
            <p className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5 text-marigold-ink" /> +91 98170 00000
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5">
              <Mail className="size-3.5 text-marigold-ink" /> booking@mahasutravels.com
            </p>
          </div>
        </header>

        <section className="border-b border-border px-6 py-6">
          <p className="font-mono-data text-[11px] uppercase tracking-[0.14em] text-marigold-ink">
            {proposal.nights}N / {proposal.days}D · Starting from ₹
            {proposal.startingFrom.toLocaleString("en-IN")}
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-2xl font-semibold leading-snug text-ink-text sm:text-3xl">
            {proposal.title}
          </h1>
          <p className="mt-2 text-sm text-slate">{proposal.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {proposal.inclusions.slice(0, 3).map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-[#f8f9fc] px-2.5 py-1 text-xs text-ink-text"
              >
                {item.toLowerCase().includes("hotel") ? (
                  <BedDouble className="size-3.5 text-marigold-ink" />
                ) : item.toLowerCase().includes("cab") ||
                  item.toLowerCase().includes("car") ||
                  item.toLowerCase().includes("transport") ? (
                  <Car className="size-3.5 text-marigold-ink" />
                ) : (
                  <Camera className="size-3.5 text-marigold-ink" />
                )}
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-0 border-b border-border sm:grid-cols-2">
          <div className="border-b border-border px-6 py-5 sm:border-r sm:border-b-0">
            <p className="mb-2 font-display text-sm font-semibold text-ink-text">Prepared for</p>
            <DetailRow icon={Users} label="Guest name" value={proposal.customer} />
            <DetailRow icon={Phone} label="Phone" value={proposal.phone || "—"} />
            <DetailRow icon={Mail} label="Email" value={proposal.email || "—"} />
            <DetailRow
              icon={MapPin}
              label="Lead / Agent"
              value={`${proposal.leadId} · ${proposal.agent}`}
            />
          </div>
          <div className="px-6 py-5">
            <p className="mb-2 font-display text-sm font-semibold text-ink-text">Trip details</p>
            <DetailRow icon={Route} label="Package" value={proposal.tourPackage} />
            <DetailRow
              icon={MapPin}
              label="Pickup → Drop"
              value={`${proposal.pickup} → ${proposal.dropoff}`}
            />
            <DetailRow icon={CalendarDays} label="Travel dates" value={travelWindow} />
            <DetailRow
              icon={Car}
              label="Cab / Pax / Days"
              value={`${proposal.cabType} · ${paxLabel} · ${proposal.days} days`}
            />
          </div>
        </section>

        <section className="border-b border-border px-6 py-5">
          <h2 className="font-display text-lg font-semibold text-ink-text">Tour overview</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate">{proposal.overview}</p>
          {proposal.tourPlan ? (
            <div className="mt-4 rounded-md border border-border bg-[#f8f9fc] px-3 py-2.5">
              <p className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-slate-soft">
                Guest note
              </p>
              <p className="mt-1 text-sm text-ink-text">{proposal.tourPlan}</p>
            </div>
          ) : null}
        </section>

        <section className="border-b border-border px-6 py-5">
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold text-ink-text">Day-wise itinerary</h2>
            <p className="mt-1 text-xs text-slate-soft">
              Detailed dummy itinerary for this proposal
            </p>
          </div>
          <div className="space-y-3">
            {proposal.itinerary.slice(0, proposal.days).map((stop) => (
              <div
                key={stop.day}
                className="rounded-md border border-border bg-white px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-[#f8f9fc] font-mono-data text-xs font-semibold text-ink-text">
                    {stop.day}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-text">
                      Day {stop.day}: {stop.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate">{stop.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-0 border-b border-border sm:grid-cols-2">
          <div className="border-b border-border px-6 py-5 sm:border-r sm:border-b-0">
            <h2 className="font-display text-base font-semibold text-ink-text">Inclusions</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate">
              {proposal.inclusions.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-teal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-6 py-5">
            <h2 className="font-display text-base font-semibold text-ink-text">Quote summary</h2>
            <div className="mt-3 rounded-md border border-border bg-[#f8f9fc] p-4">
              <p className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-slate-soft">
                Quoted amount
              </p>
              <p className="mt-1 font-display text-3xl font-semibold text-ink-text">
                ₹{proposal.quoteAmount.toLocaleString("en-IN")}
              </p>
              <div className="mt-3 space-y-1.5 text-xs text-slate">
                <p>Cab: {proposal.cabType}</p>
                <p>Duration: {proposal.days} days ({proposal.nights} nights)</p>
                <p>Guests: {paxLabel}</p>
                <p>Payment: 40% advance · Balance before trip</p>
                <p>Cancellation: Free up to 48h before travel (dummy)</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-[11px] text-slate-soft">
          <p>Mahasu Travels · Dummy PDF proposal for CRM demo</p>
          <p>
            Generated for {proposal.customer} · {proposal.leadId}
          </p>
        </footer>
      </article>
    </div>
  );
}
