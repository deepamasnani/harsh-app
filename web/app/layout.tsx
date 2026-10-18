import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import RegisterSW from "@/components/RegisterSW";
import KeyboardInset from "@/components/KeyboardInset";

export const metadata: Metadata = {
  title: "Harsh Hardware",
  description: "Stock, bills, and credit for Harsh Hardware",
  applicationName: "Harsh Hardware",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Harsh HW" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0F766E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
