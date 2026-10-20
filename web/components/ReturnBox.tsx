"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { inr, qty } from "@/lib/utils";

type Product = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  category?: string;
};

type Line = {
  product_id: number;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
};

export default function ReturnBox({
  customerId,
  onDone,
}: {
  customerId: number;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    api("/api/products")
      .then(setCatalog)
      .catch((e: Error) => setErr(e.message));
  }, [open]);

  const needle = q.trim().toLowerCase();
  const products = useMemo(
    () =>
      needle
        ? catalog.filter((p) =>
            [p.sku, p.name, p.category].some((s) => String(s || "").toLowerCase().includes(needle))
          )
        : catalog,
    [catalog, needle]
  );

  const total = lines.reduce((s, l) => s + Number(l.unit_price || 0) * l.quantity, 0);

  function add(p: Product) {
    setLines((prev) => {
      const hit = prev.find((l) => l.product_id === p.id);
      if (hit) return prev.map((l) => (l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        {
          product_id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit,
          quantity: 1,
          unit_price: p.price ?? 0,
        },
      ];
    });
    setQ("");
  }

  function setQty(id: number, quantity: number) {
    if (quantity <= 0) {
      setLines((prev) => prev.filter((l) => l.product_id !== id));
      return;
    }
    setLines((prev) => prev.map((l) => (l.product_id === id ? { ...l, quantity } : l)));
  }

  function setPrice(id: number, value: string) {
    const n = Number(value);
    if (value !== "" && (!Number.isFinite(n) || n < 0)) return;
    setLines((prev) => prev.map((l) => (l.product_id === id ? { ...l, unit_price: value === "" ? 0 : n } : l)));
  }

  async function submit() {
    setErr("");
    if (!lines.length) {
      setErr("Select at least one SKU");
      return;
    }
    setBusy(true);
    try {
      await api("/api/returns", {
        method: "POST",
        body: {
          customer_id: customerId,
          items: lines.map((l) => ({
            product_id: l.product_id,
            quantity: l.quantity,
            unit_price: Number(l.unit_price) || 0,
          })),
        },
      });
      setLines([]);
      setOpen(false);
      onDone?.();
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr("");
          setOpen(true);
        }}
        className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-medium"
      >
        Return items
      </button>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90dvh] flex flex-col">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight">Return items</h2>
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500">
                  Close
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-1">Stock goes up. Return value comes off this month’s sale.</p>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search SKU or name"
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-ink"
                autoComplete="off"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p)}
                  className="w-full text-left rounded-2xl border border-slate-200 px-4 py-3 flex justify-between gap-3 active:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.sku} · {qty(p.stock, p.unit)} on shelf
                    </p>
                  </div>
                  <p className="font-semibold text-brass-700 shrink-0">{inr(p.price)}</p>
                </button>
              ))}
              {needle && !products.length && <p className="text-sm text-slate-500">No matching SKU.</p>}
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              {lines.map((l) => (
                <div key={l.product_id} className="flex items-center gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <label className="text-[11px] text-slate-500 shrink-0">Qty</label>
                      <input
                        inputMode="decimal"
                        value={l.quantity}
                        onChange={(e) => setQty(l.product_id, Number(e.target.value) || 0)}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none"
                      />
                      <label className="text-[11px] text-slate-500 shrink-0">Rate ₹</label>
                      <input
                        inputMode="decimal"
                        value={l.unit_price}
                        onChange={(e) => setPrice(l.product_id, e.target.value)}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <button type="button" className="text-slate-400 text-xs" onClick={() => setQty(l.product_id, 0)}>
                    Remove
                  </button>
                </div>
              ))}
              {err && <p className="text-sm text-red-700 mb-2">{err}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={busy || !lines.length}
                className="w-full rounded-2xl bg-ink text-white font-semibold py-3.5 disabled:opacity-60"
              >
                {busy ? "Saving…" : `Return ${inr(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
