import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { DataProvider } from "@/lib/store";
import { SessionProvider } from "@/lib/session-context";
import { ToastProvider } from "@/lib/toast";
import { ThemeProvider } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Mahasu Travels — Dispatch CRM",
  description:
    "Custom travel cab booking CRM for Mahasu Travels — leads, quotes, bookings, drivers and trip dispatch in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full">
        <Script id="mahasu-theme-init" strategy="beforeInteractive">
          {`(function(){try{if(localStorage.getItem("mahasu-theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`}
        </Script>
        <ThemeProvider>
          <ToastProvider>
            <SessionProvider>
              <DataProvider>{children}</DataProvider>
            </SessionProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
