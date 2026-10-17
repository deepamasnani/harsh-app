// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { inr, qty } from "@/lib/utils";

export default function Billing() {
  const nav = useRouter();
  const searchRef = useRef(null);
  const nameRef = useRef(null);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [customer, setCustomer] = useState({ customer_name: "", customer_phone: "", customer_shop: "", notes: "" });
  const [picked, setPicked] = useState<any>(null);
  const [openNames, setOpenNames] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api("/api/products"), api("/api/customers")])
      .then(([p, c]) => {
        setProducts(p);
        setCustomers(c);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const nameQ = customer.customer_name.trim().toLowerCase();
  const nameMatches = useMemo(() => {
    if (!nameQ) return customers.slice(0, 8);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(nameQ) ||
          (c.phone || "").includes(nameQ) ||
          (c.shop || "").toLowerCase().includes(nameQ)
      )
      .slice(0, 8);
  }, [customers, nameQ]);

  const exactName = customers.find((c) => c.name.toLowerCase() === nameQ);
  const canAddName = nameQ && !exactName;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 12);
    return products
      .filter((p) => p.sku.toLowerCase().includes(s) || p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s))
      .slice(0, 20);
  }, [q, products]);

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  function pickExisting(c) {
    setPicked(c);
    setCustomer({
      customer_name: c.name,
      customer_phone: c.phone,
      customer_shop: c.shop,
      notes: "",
    });
    setOpenNames(false);
    searchRef.current?.focus();
  }

  function addNewName() {
    const name = customer.customer_name.trim();
    setPicked(null);
    setCustomer({ customer_name: name, customer_phone: "", customer_shop: "", notes: "" });
    setOpenNames(false);
  }

  function onNameChange(value) {
    setCustomer((prev) => ({ ...prev, customer_name: value }));
    setPicked(null);
    setOpenNames(true);
  }

  function add(p) {
    setCart((prev) => {
      const hit = prev.find((i) => i.product_id === p.id);
      if (hit) return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product_id: p.id, sku: p.sku, name: p.name, unit: p.unit, price: p.price, quantity: 1, stock: p.stock }];
    });
    setQ("");
    searchRef.current?.focus();
  }

  function setQty(id, quantity) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.product_id !== id));
      return;
    }
    setCart((prev) => prev.map((i) => (i.product_id === id ? { ...i, quantity } : i)));
  }

  async function send() {
    setErr("");
    if (!customer.customer_name.trim()) {
      setErr("Customer name is required");
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
          items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        },
      });
      nav.push(`/print/${inv.id}`);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  const known = Boolean(picked || exactName);
  const saved = picked || exactName;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
      <div>
        <p className="text-[11px] tracking-[0.22em] uppercase text-stone-500">While they are on the phone</p>
        <h1 className="font-display text-4xl mt-1 mb-4">New bill</h1>

        <div className="relative mb-3">
          <label className="text-xs text-stone-500">Customer name</label>
          <input
            ref={nameRef}
            value={customer.customer_name}
            onChange={(e) => onNameChange(e.target.value)}
            onFocus={() => setOpenNames(true)}
            onBlur={() => setTimeout(() => setOpenNames(false), 180)}
            placeholder="Type a name — pick from the list or add new"
            className="mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-3 outline-none"
            autoFocus
            autoComplete="off"
          />
          {openNames && (
            <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-stone-300 bg-white shadow-sheet overflow-hidden">
              {nameMatches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickExisting(c)}
                  className="w-full text-left px-3 py-2.5 hover:bg-paper border-b border-stone-100"
                >
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-stone-500">
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
                  className="w-full text-left px-3 py-2.5 bg-ink text-white font-medium"
                >
                  Add “{customer.customer_name.trim()}”
                </button>
              )}
              {!nameMatches.length && !canAddName && (
                <p className="px-3 py-2.5 text-sm text-stone-500">Start typing a unique name</p>
              )}
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <input
            value={known ? saved.phone : customer.customer_phone}
            onChange={(e) => setCustomer({ ...customer, customer_phone: e.target.value })}
            placeholder="Phone"
            inputMode="tel"
            disabled={known}
            className="rounded-xl border border-stone-300 bg-white px-3 py-3 outline-none focus:border-ink disabled:bg-stone-100 disabled:text-stone-600"
          />
          <input
            value={known ? saved.shop : customer.customer_shop}
            onChange={(e) => setCustomer({ ...customer, customer_shop: e.target.value })}
            placeholder="Shop / site"
            disabled={known}
            className="rounded-xl border border-stone-300 bg-white px-3 py-3 outline-none focus:border-ink disabled:bg-stone-100 disabled:text-stone-600"
          />
        </div>
        {known && (
          <p className="text-xs text-stone-500 -mt-2 mb-4">Phone and shop were saved on the first bill for this name.</p>
        )}
        {!known && customer.customer_name.trim() && (
          <p className="text-xs text-stone-500 -mt-2 mb-4">New name — phone and shop will be saved with this bill.</p>
        )}

        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type SKU or item name"
          className="w-full rounded-xl border-2 border-ink bg-white px-3 py-3.5 outline-none mb-3"
        />

        <div className="space-y-2 mb-28 lg:mb-0">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p)}
              className="w-full text-left rounded-2xl bg-white border border-stone-200 px-4 py-3 flex justify-between gap-3 hover:border-ink"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-stone-500">
                  {p.sku} · {qty(p.stock, p.unit)} in stock
                </p>
              </div>
              <p className="font-semibold">{inr(p.price)}</p>
            </button>
          ))}
          {!filtered.length && <p className="text-sm text-stone-500 px-1">No matching SKU.</p>}
        </div>
      </div>

      <aside className="fixed lg:sticky bottom-16 lg:bottom-auto lg:top-8 inset-x-0 lg:inset-auto z-20 lg:h-fit">
        <div className="mx-3 lg:mx-0 rounded-2xl bg-ink text-white p-4 shadow-sheet mb-[env(safe-area-inset-bottom)] lg:mb-0">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-sm text-stone-300">Cart · {cart.length} lines</p>
            <p className="font-display text-3xl">{inr(total)}</p>
          </div>
          <div className="max-h-40 lg:max-h-72 overflow-y-auto space-y-2 mb-3 pr-1">
            {cart.map((i) => (
              <div key={i.product_id} className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="truncate">{i.name}</p>
                  <p className="text-stone-400 text-xs">{inr(i.price)}</p>
                </div>
                <div className="flex items-center gap-1 bg-white/10 rounded-lg">
                  <button className="p-2" onClick={() => setQty(i.product_id, i.quantity - 1)}>
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center">{i.quantity}</span>
                  <button className="p-2" onClick={() => setQty(i.product_id, i.quantity + 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <button className="p-1 text-stone-400" onClick={() => setQty(i.product_id, 0)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!cart.length && <p className="text-stone-500 text-sm">Tap items to add.</p>}
          </div>
          {err && <p className="text-amber-200 text-sm mb-2">{err}</p>}
          <button
            onClick={send}
            disabled={busy}
            className="w-full rounded-xl bg-brass-500 text-ink font-semibold py-3 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Generate & send to staff"}
          </button>
        </div>
      </aside>
    </div>
  );
}
