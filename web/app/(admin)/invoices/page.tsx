// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import FolderCard from "@/components/FolderCard";
import { groupFolders } from "@/lib/utils";

const TABS = [
  { id: "", label: "All" },
  { id: "pending", label: "With staff" },
  { id: "paid", label: "Paid" },
  { id: "credit", label: "Credit" },
  { id: "settled", label: "Settled" },
];

export default function Invoices() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  async function load(s = status, search = q) {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (search) params.set("q", search);
    setRows(await api(`/api/invoices?${params}`));
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(status, q).catch((e) => setErr(e.message)), 180);
    return () => clearTimeout(t);
  }, [status, q]);

  const folders = useMemo(() => groupFolders(rows), [rows]);

  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] uppercase text-stone-500">Ledger</p>
      <h1 className="font-display text-4xl mt-1 mb-1">Invoices</h1>
      <p className="text-stone-500 text-sm mb-4">One folder per customer. Open it to see every bill.</p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
              status === t.id ? "bg-ink text-white" : "bg-white border border-stone-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search bill no., shop, phone"
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 mb-4 outline-none focus:border-ink"
      />
      {err && <p className="text-red-700 text-sm mb-3">{err}</p>}

      <div className="space-y-3">
        {folders.map((f) => (
          <FolderCard key={f.key} folder={f} to={`/invoices/customer/${encodeURIComponent(f.key)}`} />
        ))}
        {!folders.length && <p className="text-stone-500 text-sm">No invoices yet.</p>}
      </div>
    </div>
  );
}
