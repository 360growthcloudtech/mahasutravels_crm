import { Suspense } from "react";
import ProposalPage from "./proposal-client";

export default function ProposalRoutePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-paper p-8">
          <p className="text-sm text-muted-foreground">Loading proposal…</p>
        </main>
      }
    >
      <ProposalPage />
    </Suspense>
  );
}
