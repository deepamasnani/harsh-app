"use client";

import Gate from "@/components/Gate";
import StaffShell from "@/components/StaffShell";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Gate role="staff">
      <StaffShell>{children}</StaffShell>
    </Gate>
  );
}
