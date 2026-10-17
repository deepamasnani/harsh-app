"use client";

import Gate from "@/components/Gate";

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <Gate>{children}</Gate>;
}
