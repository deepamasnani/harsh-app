// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { inr, qty } from "@/lib/utils";

export default function Billing() {
  const nav = useRouter();
  const searchRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customer, setCustomer] = useState({ customer_name: "", customer_phone: "", customer_shop: "", notes: "" });
  const [nameMatches, setNameMatches] = useState([]);
  const [openNames, setOpenNames] = useState(false);
  const [picked, setPicked] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const name = p.get("name");
    if (!name) return;
    setCustomer({
      customer_name: name,
      customer_phone: p.get("phone") || "",
      customer_shop: p.get("shop") || "",
      notes: "",
    });
    setPicked({ name, phone: p.get("phone") || "", shop: p.get("shop") || "" });
  }, []);

  useEffect(() => {
    if (!openNames) return;
    const s = customer.customer_name.trim();
    const t = setTimeout(() => {
      api(`/api/customers?q=${encodeURIComponent(s)}&limit=8`)
        .then(setNameMatches)
        .catch(() => undefined);
    }, 120);
    return () => clearTimeout(t);
  }, [customer.customer_name, openNames]);

  const nameQ = customer.customer_name.trim().toLowerCase();
  const exactName = nameMatches.find((c) => c.name.toLowerCase() === nameQ);
  const canAddName = Boolean(nameQ && !exactName && !picked);

  function pickExisting(c) {
    setPicked(c);
    setCustomer({
      customer_name: c.name,
      customer_phone: c.phone || "",
      customer_shop: c.shop || "",
      notes: "",
    });
    setOpenNames(false);
    setNameMatches([]);
  }

  function addNewName() {
    const name = customer.customer_name.trim();
    setPicked(null);
    setCustomer((prev) => ({ ...prev, customer_name: name }));
    setOpenNames(false);
  }

  function onNameChange(value) {
    setCustomer((prev) => ({ ...prev, customer_name: value }));
    setPicked(null);
    setOpenNames(true);
    setCartOpen(false);
  }

  useEffect(() => {
    const s = q.trim();
    if (s.length < 1) {
      setProducts([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      api(`/api/products?q=${encodeURIComponent(s)}&limit=25`)
        .then(setProducts)
        .catch((e) => setErr(e.message))
        .finally(() => setSearching(false));
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  const total = cart.reduce((s, i) => s + Number(i.price || 0) * i.quantity, 0);

  function add(p) {
    setCart((prev) => {
      const hit = prev.find((i) => i.product_id === p.id);
      if (hit) return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product_id: p.id, sku: p.sku, name: p.name, unit: p.unit, price: p.price ?? 0, quantity: 1, stock: p.stock }];
    });
    setQ("");
    setProducts([]);
  }

  function setQty(id, quantity) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.product_id !== id));
      return;
    }
    setCart((prev) => prev.map((i) => (i.product_id === id ? { ...i, quantity } : i)));
  }

  function setPrice(id, value) {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== id) return i;
        if (value === "") return { ...i, price: "" };
        const n = Number(value);
        return { ...i, price: Number.isFinite(n) && n >= 0 ? n : i.price };
      })
    );
  }

  async function send() {
    setErr("");
    if (!customer.customer_name.trim()) {
      setErr("Customer name is required");
      setCartOpen(true);
      return;
    }
    if (!cart.length) {
      setErr("Add at least one item");
      return;
    }
    setBusy(true);
    try {
      const inv = await api("/api/invoices", {
        method: "POST",
        body: {
          ...customer,
          items: cart.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.price === "" ? 0 : Number(i.price) || 0,
          })),
        },
      });
      nav.push(`/print/${inv.id}`);
    } catch (ex) {
      setErr(ex.message);
      setCartOpen(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-36">
      <div className="flex items-end justify-between gap-3 mb-3">
        <h1 className="text-2xl font-semibold tracking-tight">New bill</h1>
        <Link href="/customers" className="text-sm text-brass-700 font-medium pb-0.5">
          Saved names
        </Link>
      </div>

      <label className="text-xs font-medium text-slate-500">Customer</label>
      <div className="relative mt-1 mb-2">
        <input
          value={customer.customer_name}
          onChange={(e) => onNameChange(e.target.value)}
          onFocus={() => {
            setOpenNames(true);
            setCartOpen(false);
          }}
          onBlur={() => setTimeout(() => setOpenNames(false), 180)}
          placeholder="Type a saved name or a new one"
          className="w-full rounded-2xl border-2 border-ink bg-white px-3 py-3 outline-none"
          autoComplete="off"
          enterKeyHint="next"
        />
        {openNames && (
          <div className="absolute z-30 left-0 right-0 mt-1 rounded-2xl border border-slate-200 bg-white shadow-sheet overflow-hidden max-h-64 overflow-y-auto">
            {nameMatches.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickExisting(c)}
                className="w-full text-left px-4 py-3 border-b border-slate-100 active:bg-slate-50"
              >
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-slate-500">
                  {c.phone || "No phone"}
                  {c.shop && c.shop !== c.name ? ` · ${c.shop}` : ""}
                </p>
              </button>
            ))}
            {canAddName && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={addNewName}
                className="w-full text-left px-4 py-3 bg-ink text-white font-medium"
              >
                Add “{customer.customer_name.trim()}”
              </button>
            )}
            {!nameMatches.length && !canAddName && (
              <p className="px-4 py-3 text-sm text-slate-500">Saved names appear as you type.</p>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2 mb-4">
        <input
          value={customer.customer_phone}
          onChange={(e) => setCustomer((c) => ({ ...c, customer_phone: e.target.value }))}
          placeholder="Phone"
          inputMode="tel"
          className="rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brass-500"
        />
        <input
          value={customer.customer_shop}
          onChange={(e) => setCustomer((c) => ({ ...c, customer_shop: e.target.value }))}
          placeholder="Shop / site"
          className="rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brass-500"
        />
      </div>

      <label className="text-xs font-medium text-slate-500">Add item</label>
      <input
        ref={searchRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setCartOpen(false)}
        placeholder="Type SKU or name"
        className="mt-1 w-full rounded-2xl border-2 border-ink bg-white px-3 py-3.5 outline-none"
        autoComplete="off"
        enterKeyHint="search"
      />

      <div className="mt-3 space-y-2">
        {searching && <p className="text-sm text-slate-500 px-1">Searching…</p>}
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => add(p)}
            className="w-full text-left rounded-2xl bg-white border border-slate-200 px-4 py-3 flex justify-between gap-3 active:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="font-medium leading-snug">{p.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {p.sku} · {qty(p.stock, p.unit)} left
              </p>
            </div>
            <p className="font-semibold text-brass-700 shrink-0">{inr(p.price)}</p>
          </button>
        ))}
        {q.trim() && !searching && !products.length && <p className="text-sm text-slate-500 px-1">No matching SKU.</p>}
        {!q.trim() && !cart.length && <p className="text-sm text-slate-500 px-1 pt-2">Search a tape code, then tap to add.</p>}
      </div>

      <aside className="cart-dock fixed inset-x-0 z-20 px-3">
        <div className="rounded-3xl bg-ink text-white shadow-sheet overflow-hidden">
          <button type="button" onClick={() => setCartOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-300">
              Cart · {cart.length} {cart.length === 1 ? "item" : "items"}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-xl font-semibold tabular-nums">{inr(total)}</span>
              {cartOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </span>
          </button>

          {cartOpen && (
            <div className="px-4 pb-4">
              <div className="max-h-[42dvh] overflow-y-auto overscroll-contain space-y-3 pr-0.5">
                {cart.map((i) => (
                  <div key={i.product_id} className="rounded-2xl bg-white/10 p-3">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 min-w-0 text-sm font-medium leading-snug">{i.name}</p>
                      <button className="text-slate-400 p-1" onClick={() => setQty(i.product_id, 0)} aria-label="Remove">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-[11px] text-slate-400 shrink-0">Rate ₹</label>
                      <input
                        inputMode="decimal"
                        value={i.price}
                        onChange={(e) => setPrice(i.product_id, e.target.value)}
                        className="w-24 rounded-lg bg-white text-ink px-2 py-1.5 text-sm outline-none"
                      />
                      <div className="ml-auto flex items-center gap-1 bg-white/10 rounded-lg">
                        <button className="p-2" onClick={() => setQty(i.product_id, i.quantity - 1)}>
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm">{i.quantity}</span>
                        <button className="p-2" onClick={() => setQty(i.product_id, i.quantity + 1)}>
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {!cart.length && <p className="text-slate-400 text-sm">Tap items to add.</p>}
              </div>
              {err && <p className="text-amber-200 text-sm mt-3">{err}</p>}
              <button
                onClick={send}
                disabled={busy}
                className="mt-3 w-full rounded-2xl bg-brass-500 text-white font-semibold py-3.5 disabled:opacity-60"
              >
                {busy ? "Sending…" : "Generate bill"}
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
