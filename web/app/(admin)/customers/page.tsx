"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Customer = {
  id: number;
  name: string;
  phone: string;
  shop: string;
  invoice_count: number;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api(`/api/customers?q=${encodeURIComponent(q.trim())}&limit=60`)
        .then(setRows)
        .catch((e: Error) => setErr(e.message));
    }, 140);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Customers</h1>
      <p className="text-slate-500 text-sm mb-4">Saved from bills. Tap one to start a new bill with their name and phone filled in.</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, phone, shop"
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 mb-4 outline-none focus:border-brass-500"
        autoComplete="off"
      />
      {err && <p className="text-red-700 text-sm mb-3">{err}</p>}
      <div className="space-y-2">
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/billing?name=${encodeURIComponent(c.name)}&phone=${encodeURIComponent(c.phone)}&shop=${encodeURIComponent(c.shop)}`}
            className="block rounded-2xl bg-white border border-slate-200 px-4 py-3"
          >
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {c.phone || "No phone"}
              {c.shop && c.shop !== c.name ? ` · ${c.shop}` : ""}
              {` · ${c.invoice_count} ${c.invoice_count === 1 ? "bill" : "bills"}`}
            </p>
          </Link>
        ))}
        {!rows.length && <p className="text-slate-500 text-sm">No saved names yet. They appear after you generate a bill.</p>}
      </div>
    </div>
  );
}
