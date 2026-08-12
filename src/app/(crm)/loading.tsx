export default function CrmLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8">
      <div
        className="size-8 animate-spin rounded-full border-2 border-border-soft border-t-marigold"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
