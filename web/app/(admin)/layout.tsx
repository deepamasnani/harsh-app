"use client";

import Gate from "@/components/Gate";
import AdminShell from "@/components/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Gate role="admin">
      <AdminShell>{children}</AdminShell>
    </Gate>
  );
}
