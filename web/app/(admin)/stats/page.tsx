"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { inr, qty } from "@/lib/utils";

type ProductRow = { sku: string; name: string; qty: number; sale: number; stock: number };
type MonthRow = { month: string; label: string; bills: number; sale: number };
type Stats = {
  month: string;
  month_label: string;
  bills: number;
  sale: number;
  credit: number;
  top: ProductRow | null;
  months: MonthRow[];
  products: ProductRow[];
};

export default function StatsPage() {
  const [month, setMonth] = useState("");
  const [data, setData] = useState<Stats | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const path = month ? `/api/stats?month=${encodeURIComponent(month)}` : "/api/stats";
    api(path)
      .then((d: Stats) => {
        setData(d);
        setMonth((cur) => cur || d.month);
      })
      .catch((e: Error) => setErr(e.message));
  }, [month]);

  const products = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || !data) return data?.products || [];
    return data.products.filter(
      (p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)
    );
  }, [data, q]);

  if (err) return <p className="text-red-700">{err}</p>;
  if (!data) return <p className="text-slate-500">Loading sales…</p>;

  return (
    <div className="pb-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
      <p className="text-slate-500 text-sm mt-1 mb-4">{data.month_label}</p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setMonth("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
            month === "all" ? "bg-ink text-white" : "bg-white border border-slate-200"
          }`}
        >
          All time
        </button>
        {data.months.map((m) => (
          <button
            key={m.month}
            type="button"
            onClick={() => setMonth(m.month)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
              month === m.month ? "bg-ink text-white" : "bg-white border border-slate-200"
            }`}
          >
            {m.label.replace(/ \d{4}$/, "")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Sale</p>
          <p className="text-2xl font-semibold mt-1 tracking-tight">{inr(data.sale)}</p>
          <p className="text-sm text-slate-500 mt-1">{data.bills} bills</p>
        </div>
        <div className="rounded-3xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Still on credit</p>
          <p className="text-2xl font-semibold mt-1 tracking-tight">{inr(data.credit)}</p>
        </div>
      </div>

      {data.top && (
        <div className="mt-3 rounded-3xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Best seller</p>
          <p className="font-semibold mt-1 leading-snug">{data.top.name}</p>
          <p className="text-sm text-slate-500 mt-1">
            {data.top.sku} · {qty(data.top.qty)} sold · {inr(data.top.sale)}
          </p>
        </div>
      )}

      <h2 className="text-sm font-semibold mt-6 mb-2">Sale by month</h2>
      <div className="rounded-3xl bg-white border border-slate-200 divide-y">
        {data.months.map((m) => (
          <button
            key={m.month}
            type="button"
            onClick={() => setMonth(m.month)}
            className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
          >
            <span>
              <span className="font-medium">{m.label}</span>
              <span className="text-xs text-slate-500 ml-2">{m.bills} bills</span>
            </span>
            <span className="font-semibold tabular-nums">{inr(m.sale)}</span>
          </button>
        ))}
        {!data.months.length && <p className="px-4 py-3 text-sm text-slate-500">No bills yet.</p>}
      </div>

      <h2 className="text-sm font-semibold mt-6 mb-2">Sale by product</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search SKU or name"
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 mb-3 outline-none"
        autoComplete="off"
      />
      <div className="rounded-3xl bg-white border border-slate-200 divide-y overflow-hidden">
        {products.map((p) => (
          <div key={`${p.sku}-${p.name}`} className="px-4 py-3">
            <div className="flex justify-between gap-3">
              <p className="font-medium leading-snug min-w-0">{p.name}</p>
              <p className="font-semibold shrink-0 tabular-nums">{inr(p.sale)}</p>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {p.sku} · {qty(p.qty)} sold · {qty(p.stock)} left
            </p>
          </div>
        ))}
        {!products.length && <p className="px-4 py-3 text-sm text-slate-500">No product sales in this period.</p>}
      </div>
    </div>
  );
}
