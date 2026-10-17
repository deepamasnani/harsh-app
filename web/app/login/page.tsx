"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const nav = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) nav.replace(user.role === "admin" ? "/" : "/staff");
  }, [ready, user, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await login(username, password);
      nav.replace(u.role === "admin" ? "/" : "/staff");
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-ink text-white flex-col justify-between p-12">
        <div>
          <p className="text-[11px] tracking-[0.28em] uppercase text-brass-400">Since the counter opened</p>
          <h1 className="font-display text-6xl mt-4 leading-none">
            Harsh
            <br />
            Hardware
          </h1>
        </div>
        <p className="text-stone-400 max-w-sm text-lg leading-relaxed">
          Stock on the shelf. A bill on the call. A signature on the doorstep.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <p className="lg:hidden font-display text-4xl mb-1">Harsh Hardware</p>
          <h2 className="text-xl font-semibold mb-6">Sign in</h2>
          <label className="block text-sm text-stone-600 mb-1">Username</label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 mb-4 outline-none focus:border-ink"
            autoComplete="username"
          />
          <label className="block text-sm text-stone-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 mb-4 outline-none focus:border-ink"
            autoComplete="current-password"
          />
          {err && <p className="text-sm text-red-700 mb-3">{err}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-ink text-white py-3 font-semibold disabled:opacity-60">
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
