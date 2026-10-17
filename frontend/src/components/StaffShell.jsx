import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../auth.jsx";

export default function StaffShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 bg-ink text-white px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-display text-xl leading-none">Deliveries</p>
          <p className="text-[10px] tracking-widest uppercase text-brass-400 mt-1">
            {user?.full_name || "Staff"}
          </p>
        </div>
        <button
          onClick={() => {
            logout();
            nav("/login");
          }}
          className="text-stone-300 p-2"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4 pb-8">
        <Outlet />
      </main>
    </div>
  );
}
