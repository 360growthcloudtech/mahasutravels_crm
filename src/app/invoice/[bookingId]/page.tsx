import { Suspense } from "react";
import InvoicePage from "./invoice-client";

export default function InvoiceRoutePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#ebe4d6] p-8">
          <p className="text-sm text-[#5c5346]">Loading invoice…</p>
        </main>
      }
    >
      <InvoicePage />
    </Suspense>
  );
}
