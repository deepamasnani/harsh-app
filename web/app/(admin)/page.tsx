"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { inr, qty } from "@/lib/utils";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/dashboard").then(setData).catch((e: any) => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-700">{err}</p>;
  if (!data) return <p className="text-slate-500">Loading desk…</p>;

  const cards = [
    { label: "Today’s bills", value: data.today_bills, sub: inr(data.today_amount), to: "/invoices" },
    { label: "With staff", value: data.pending_deliveries, sub: inr(data.pending_amount), to: "/invoices" },
    { label: "Credit outstanding", value: inr(data.credit_outstanding), sub: `${data.credit_count} signed dues`, to: "/creditors" },
    { label: "SKUs on shelf", value: data.sku_count, sub: `${data.low_stock} low stock`, to: "/inventory" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Today</h1>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.to} className="rounded-3xl bg-white p-4 border border-slate-200">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="text-2xl font-semibold mt-2 tracking-tight">{c.value}</p>
            <p className="text-sm text-slate-500 mt-1">{c.sub}</p>
          </Link>
        ))}
      </div>

      <Link href="/stats" className="mt-4 block rounded-3xl bg-white p-4 border border-slate-200">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">{data.month_label || "This month"}</p>
          <p className="text-xs font-medium text-brass-700">Full stats</p>
        </div>
        <p className="text-2xl font-semibold mt-2 tracking-tight">{inr(data.month_amount)}</p>
        <p className="text-sm text-slate-500 mt-1">{data.month_bills || 0} bills</p>
        {data.top_product && (
          <p className="text-sm text-slate-600 mt-3 leading-snug">
            Best seller · {data.top_product.name} · {qty(data.top_product.qty)} · {inr(data.top_product.sale)}
          </p>
        )}
      </Link>

      <Link href="/billing" className="mt-6 flex items-center justify-center rounded-2xl bg-brass-600 text-white py-3.5 font-semibold">
        New bill
      </Link>
      <Link href="/customers" className="mt-3 flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-3 text-sm font-medium">
        Saved customers
      </Link>
    </div>
  );
}
