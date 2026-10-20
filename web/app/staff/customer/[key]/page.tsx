// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { inr, relative } from "@/lib/utils";

export default function StaffFolder() {
  const { key } = useParams();
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState("");

  async function load() {
    setRows(await api("/api/invoices"));
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  const invoices = useMemo(() => rows.filter((r) => r.customer_key === key), [rows, key]);
  const head = invoices[0];
  const pending = invoices.filter((i) => i.status === "pending");
  const rest = invoices.filter((i) => i.status !== "pending");

  if (err) return <p className="text-red-700">{err}</p>;
  if (!head) return <p className="text-stone-500">This folder is empty.</p>;

  return (
    <div>
      <Link href="/staff" className="text-sm underline">
        All folders
      </Link>
      <h1 className="font-display text-3xl mt-3 leading-tight">{head.customer_shop || head.customer_name}</h1>
      <p className="text-stone-500 text-sm mt-1">{head.customer_phone || "No phone"}</p>

      {pending.length > 0 && (
        <>
          <h2 className="text-xs tracking-widest uppercase text-stone-500 mt-6 mb-2">To deliver</h2>
          <ul className="space-y-2">
            {pending.map((inv) => (
              <li key={inv.id}>
                <Link href={`/staff/receipt/${inv.id}`} className="block rounded-2xl bg-white border-2 border-ink p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-stone-500">{inv.number}</p>
                      <p className="text-sm text-stone-500">{inv.item_count} items · {relative(inv.created_at)}</p>
                    </div>
                    <p className="font-display text-2xl">{inr(inv.total)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="text-xs tracking-widest uppercase text-stone-500 mt-6 mb-2">Done today</h2>
          <ul className="space-y-2">
            {rest.map((inv) => (
              <li key={inv.id} className="rounded-2xl bg-white border border-stone-200 p-4">
                <Link href={`/staff/receipt/${inv.id}`} className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-mono text-xs text-stone-500">{inv.number}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="text-right">
                    <p>{inr(inv.total)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
