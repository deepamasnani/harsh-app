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
    <div className="min-h-dvh flex items-center justify-center p-6 bg-paper">
      <form onSubmit={submit} className="w-full max-w-sm">
        <p className="text-[11px] tracking-[0.22em] uppercase text-brass-600">Harsh Hardware</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-2 mb-6">Sign in</h1>
        <label className="block text-sm text-slate-600 mb-1">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 mb-4 outline-none focus:border-brass-500"
          autoComplete="username"
          name="username"
        />
        <label className="block text-sm text-slate-600 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 mb-4 outline-none focus:border-brass-500"
          autoComplete="current-password"
          name="password"
        />
        {err && <p className="text-sm text-red-700 mb-3">{err}</p>}
        <button disabled={busy} className="w-full rounded-2xl bg-brass-600 text-white py-3.5 font-semibold disabled:opacity-60">
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
