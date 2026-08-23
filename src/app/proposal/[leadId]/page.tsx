import { Suspense } from "react";
import ProposalPage from "./proposal-client";

export default function ProposalRoutePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#ebe4d6] p-8">
          <p className="text-sm text-[#5c5346]">Loading proposal…</p>
        </main>
      }
    >
      <ProposalPage />
    </Suspense>
  );
}
