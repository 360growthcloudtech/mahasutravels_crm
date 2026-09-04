"use client";

export function formatCreatedAt(iso?: string) {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

export function CreatedAtDisplay({
  iso,
  stacked = false,
}: {
  iso?: string;
  stacked?: boolean;
}) {
  const created = formatCreatedAt(iso);
  if (!created) return "—";
  if (!stacked) return `${created.date} · ${created.time}`;
  return (
    <>
      <p>{created.date}</p>
      <p className="font-mono-data text-[11px] text-slate-soft">{created.time}</p>
    </>
  );
}
