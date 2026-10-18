import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, LogOut, Package, Receipt, Truck } from "lucide-react";
import { useAuth } from "../auth.jsx";

const links = [
  { to: "/", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/billing", icon: Receipt, label: "Billing" },
  { to: "/inventory", icon: Package, label: "Stock" },
  { to: "/invoices", icon: BookOpen, label: "Invoices" },
  { to: "/creditors", icon: Truck, label: "Credit" },
];

function Item({ to, icon: Icon, label, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive ? "bg-brass-500 text-ink" : "text-stone-300 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <Icon size={18} strokeWidth={1.75} />
      {label}
    </NavLink>
  );
}

export default function AdminShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print hidden lg:flex w-60 shrink-0 flex-col bg-ink text-white">
        <div className="px-5 pt-8 pb-6 border-b border-white/10">
          <p className="font-display text-2xl leading-none">BB</p>
          <p className="text-[11px] tracking-[0.22em] uppercase text-brass-400 mt-1">Traders</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <Item key={l.to} {...l} />
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-stone-400">{user?.full_name}</p>
          <button
            onClick={() => {
              logout();
              nav("/login");
            }}
            className="mt-2 flex items-center gap-2 text-sm text-stone-300 hover:text-white"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <header className="no-print lg:hidden sticky top-0 z-20 bg-ink text-white px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-display text-xl leading-none">BB Traders</p>
            <p className="text-[10px] tracking-widest uppercase text-brass-400 mt-1">Owner desk</p>
          </div>
          <button
            onClick={() => {
              logout();
              nav("/login");
            }}
            className="text-stone-300"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-5 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-ink text-white border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] ${
                  isActive ? "text-brass-400" : "text-stone-400"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
