import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import RegisterSW from "@/components/RegisterSW";
import KeyboardInset from "@/components/KeyboardInset";

export const metadata: Metadata = {
  title: "Meraki Edge Band",
  description: "Stock, bills, and credit for Meraki Edge Band",
  applicationName: "Meraki Edge Band",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Meraki" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const preferredRegion = ["sin1"];
export const runtime = "nodejs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <KeyboardInset />
        <AuthProvider>{children}</AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
