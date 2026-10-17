"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [status, setStatus] = useState<{ connected: boolean; email?: string | null } | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setStatus(await api("/api/auth/google"));
  }

  useEffect(() => {
    load().catch((e: any) => setErr(e.message));
    const q = new URLSearchParams(window.location.search).get("drive");
    if (q === "ok") setMsg("Google Drive connected.");
    if (q === "error") setErr("Could not connect Google Drive. Try again.");
  }, []);

  async function connect() {
    setErr("");
    const data: any = await api("/api/auth/google", { method: "POST" });
    window.location.href = data.url;
  }

  async function disconnect() {
    if (!confirm("Disconnect Google Drive? New invoices will stay in the database until you connect again.")) return;
    await api("/api/auth/google", { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] uppercase text-stone-500">Shop</p>
      <h1 className="font-display text-4xl mt-1 mb-4">Settings</h1>
      <div className="rounded-2xl bg-white border border-stone-200 p-5 max-w-lg">
        <h2 className="font-semibold">Google Drive</h2>
        <p className="text-sm text-stone-600 mt-1">
          Invoice PDFs and credit signatures are dumped to Drive under Harsh Hardware / invoices and signatures.
        </p>
        {status?.connected ? (
          <p className="mt-3 text-emerald-800 text-sm">Connected as {status.email || "Google account"}</p>
        ) : (
          <p className="mt-3 text-stone-500 text-sm">Not connected.</p>
        )}
        {msg && <p className="text-sm text-emerald-800 mt-2">{msg}</p>}
        {err && <p className="text-sm text-red-700 mt-2">{err}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={connect} className="rounded-xl bg-ink text-white px-4 py-2.5 text-sm font-semibold">
            {status?.connected ? "Reconnect Drive" : "Connect Google Drive"}
          </button>
          {status?.connected && (
            <button onClick={disconnect} className="rounded-xl border px-4 py-2.5 text-sm">
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
