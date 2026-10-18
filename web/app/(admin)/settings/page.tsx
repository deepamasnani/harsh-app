"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [status, setStatus] = useState<{ connected: boolean; email?: string | null; configured?: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  async function load() {
    setStatus(await api("/api/auth/google"));
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    load().catch((e: any) => setErr(e.message));
    const q = new URLSearchParams(window.location.search).get("drive");
    if (q === "ok") setMsg("Google Drive connected.");
    if (q === "error") setErr("Google blocked the redirect. Use a Web application OAuth client with the callback URL below.");
    if (q === "missing") setErr("Google did not send an auth code. Try Connect again.");
  }, []);

  async function connect() {
    setErr("");
    setBusy(true);
    try {
      const data: any = await api("/api/auth/google", { method: "POST" });
      if (!data?.url) throw new Error("No Google URL returned");
      window.location.assign(data.url);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect Google Drive? New invoices will stay in the database until you connect again.")) return;
    await api("/api/auth/google", { method: "DELETE" });
    await load();
  }

  const callback = origin ? `${origin}/api/auth/google/callback` : "";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Settings</h1>
      <div className="rounded-3xl bg-white border border-slate-200 p-5 max-w-lg">
        <h2 className="font-semibold">Google Drive</h2>
        <p className="text-sm text-slate-600 mt-1">
          Invoices go to BB Traders / invoices / customer / date. Signatures go to BB Traders / signatures / customer / date.
        </p>
        {status?.connected ? (
          <p className="mt-3 text-emerald-800 text-sm">Connected as {status.email || "Google account"}</p>
        ) : (
          <p className="mt-3 text-slate-500 text-sm">Not connected.</p>
        )}
        {msg && <p className="text-sm text-emerald-800 mt-2">{msg}</p>}
        {err && <p className="text-sm text-red-700 mt-2">{err}</p>}
        {callback && (
          <div className="mt-3 rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">OAuth callback (Web client)</p>
            <p className="text-xs break-all mt-1 font-mono">{callback}</p>
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={connect}
            disabled={busy}
            className="rounded-2xl bg-brass-600 text-white px-4 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Opening Google…" : status?.connected ? "Reconnect Drive" : "Connect Google Drive"}
          </button>
          {status?.connected && (
            <button onClick={disconnect} className="rounded-2xl border px-4 py-3 text-sm">
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
