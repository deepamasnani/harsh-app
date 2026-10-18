"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function StaffShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useRouter();

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold leading-none">Deliveries</p>
          <p className="text-[10px] tracking-widest uppercase text-brass-600 mt-1">{user?.full_name || "Staff"}</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            nav.push("/login");
          }}
          className="text-slate-600 p-2"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4 pb-8">{children}</main>
    </div>
  );
}
