// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import FolderCard from "@/components/FolderCard";
import { groupFolders } from "@/lib/utils";

export default function Receipts() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/invoices")
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, []);

  const folders = useMemo(() => groupFolders(rows), [rows]);
  const waiting = folders.filter((f) => f.pending > 0);
  const earlier = folders.filter((f) => f.pending === 0);

  if (err) return <p className="text-red-700">{err}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Receipts</h1>
      <p className="text-stone-500 text-sm mb-5">
        {waiting.length
          ? `${waiting.reduce((s, f) => s + f.pending, 0)} waiting — including bills from earlier days`
          : "Nothing waiting with staff"}
      </p>

      <div className="space-y-3">
        {waiting.map((f) => (
          <FolderCard key={f.key} folder={f} hideDue to={`/staff/customer/${encodeURIComponent(f.key)}`} />
        ))}
      </div>

      {earlier.length > 0 && (
        <>
          <h2 className="text-xs tracking-widest uppercase text-stone-500 mt-8 mb-3">Done today</h2>
          <div className="space-y-3">
            {earlier.map((f) => (
              <FolderCard key={f.key} folder={f} hideDue to={`/staff/customer/${encodeURIComponent(f.key)}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
