import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DataProvider } from "@/lib/store";
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("mahasu-theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <ToastProvider>
            <DataProvider>{children}</DataProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
