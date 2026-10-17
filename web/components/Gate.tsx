"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

export default function Gate({ role, children }: { role?: string; children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (role && user.role !== role) router.replace(user.role === "admin" ? "/" : "/staff");
  }, [ready, user, role, router]);

  if (!ready || !user || (role && user.role !== role)) {
    return <div className="min-h-screen grid place-items-center text-stone-500">Opening ledger…</div>;
  }
  return <>{children}</>;
}
