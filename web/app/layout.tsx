import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import RegisterSW from "@/components/RegisterSW";

const display = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Harsh Hardware",
  description: "Stock, bills, and credit for Harsh Hardware",
  applicationName: "Harsh Hardware",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Harsh HW" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1c1612",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
