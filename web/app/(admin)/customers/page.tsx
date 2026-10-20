"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { inr } from "@/lib/utils";

type Customer = {
  id: number;
  name: string;
  phone: string;
  shop: string;
  invoice_count: number;
  credit_outstanding: number;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/customers")
      .then(setRows)
      .catch((e: Error) => setErr(e.message));
  }, []);

  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      needle
        ? rows.filter((c) =>
            [c.name, c.phone, c.shop].some((s) => String(s || "").toLowerCase().includes(needle))
          )
        : rows,
    [rows, needle]
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Customers</h1>
      <p className="text-slate-500 text-sm mb-4">
        {needle ? `${shown.length} of ${rows.length}` : rows.length} saved names. Open one for bills, credit, and returns.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, phone, shop"
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 mb-4 outline-none focus:border-brass-500"
        autoComplete="off"
      />
      {err && <p className="text-red-700 text-sm mb-3">{err}</p>}
      <div className="space-y-2">
        {shown.map((c) => (
          <Link
            key={c.id}
            href={`/customers/${c.id}`}
            className="block rounded-2xl bg-white border border-slate-200 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.phone || "No phone"}
                  {c.shop && c.shop !== c.name ? ` · ${c.shop}` : ""}
                  {` · ${c.invoice_count} ${c.invoice_count === 1 ? "bill" : "bills"}`}
                </p>
              </div>
              {c.credit_outstanding > 0 && (
                <p className="text-xs font-semibold text-orange-900 shrink-0">{inr(c.credit_outstanding)}</p>
              )}
            </div>
          </Link>
        ))}
        {!shown.length && (
          <p className="text-slate-500 text-sm">
            {needle ? "No matching customer." : "No saved names yet. They appear after you generate a bill."}
          </p>
        )}
      </div>
    </div>
  );
}
