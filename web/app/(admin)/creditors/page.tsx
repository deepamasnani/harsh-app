// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import FolderCard from "@/components/FolderCard";
import { groupFolders, inr } from "@/lib/utils";

export default function Creditors() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/invoices?status=credit")
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, []);

  const folders = useMemo(() => groupFolders(rows), [rows]);
  const outstanding = folders.reduce((s, f) => s + Number(f.outstanding || 0), 0);

  if (err) return <p className="text-red-700">{err}</p>;

  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] uppercase text-stone-500">Signed dues</p>
      <h1 className="font-display text-4xl mt-1">Creditors</h1>
      <p className="text-stone-600 mt-2 mb-6">
        {folders.length} {folders.length === 1 ? "folder" : "folders"} · outstanding {inr(outstanding)}
      </p>

      <div className="space-y-3">
        {folders.map((f) => (
          <FolderCard key={f.key} folder={f} to={`/creditors/customer/${encodeURIComponent(f.key)}`} />
        ))}
        {!folders.length && <p className="text-stone-500">No open credit. Signed receipts will land here.</p>}
      </div>
    </div>
  );
}
