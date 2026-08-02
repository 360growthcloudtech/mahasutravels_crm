import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/lib/store";
import { ToastProvider } from "@/lib/toast";

export const metadata: Metadata = {
  title: "Mahasu Travels — Dispatch CRM",
  description:
    "Custom travel cab booking CRM for Mahasu Travels — leads, quotes, bookings, drivers and trip dispatch in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <ToastProvider>
          <DataProvider>{children}</DataProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
