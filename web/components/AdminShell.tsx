"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutDashboard, LogOut, Package, Receipt, Settings, Truck, Users } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { api } from "@/lib/api";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/billing", icon: Receipt, label: "Billing" },
  { to: "/inventory", icon: Package, label: "Stock" },
  { to: "/customers", icon: Users, label: "Customers" },
  { to: "/invoices", icon: BookOpen, label: "Bills" },
  { to: "/creditors", icon: Truck, label: "Credit" },
];

function itemClass(active: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    active ? "bg-brass-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
  }`;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useRouter();
  const path = usePathname();

  function isActive(to: string, end?: boolean) {
    if (end) return path === to;
    return path === to || path.startsWith(to + "/");
  }

  useEffect(() => {
    api("/api/dashboard").catch(() => undefined);
    api("/api/invoices?status=credit").catch(() => undefined);
    api("/api/customers").catch(() => undefined);
  }, []);

  async function signOut() {
    await logout();
    nav.push("/login");
  }

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="no-print hidden lg:flex w-60 shrink-0 flex-col bg-ink text-white">
        <div className="px-5 pt-8 pb-6 border-b border-white/10">
          <p className="text-2xl font-semibold leading-none tracking-tight">Meraki</p>
          <p className="text-[11px] tracking-[0.18em] uppercase text-brass-400 mt-1">Edge Band</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <Link key={l.to} href={l.to} className={itemClass(isActive(l.to, l.end))}>
              <l.icon size={18} strokeWidth={1.75} />
              {l.label}
            </Link>
          ))}
          <Link href="/settings" className={itemClass(isActive("/settings"))}>
            <Settings size={18} strokeWidth={1.75} />
            Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-slate-400">{user?.full_name}</p>
          <button onClick={signOut} className="mt-2 flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <header className="app-header no-print lg:hidden sticky top-0 z-20 border-b border-slate-200 px-4 pb-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold leading-none tracking-tight">Meraki Edge Band</p>
            <p className="text-[10px] tracking-widest uppercase text-brass-600 mt-1">Owner desk</p>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/settings" className="text-slate-600 p-2" aria-label="Settings">
              <Settings size={18} />
            </Link>
            <button onClick={signOut} className="text-slate-600 p-2" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 pt-5 pb-4 lg:px-8 lg:py-8">{children}</main>
      </div>

      <nav className="tabbar no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200">
        <div className="grid grid-cols-6">
          {links.map(({ to, icon: Icon, label, end }) => (
            <Link
              key={to}
              href={to}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 text-[10px] ${
                isActive(to, end) ? "text-brass-600" : "text-slate-400"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
