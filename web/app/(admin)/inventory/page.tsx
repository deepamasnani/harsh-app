// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { inr, qty } from "@/lib/utils";

const empty = { sku: "", name: "", unit: "pcs", price: "", stock: "", category: "General" };

export default function Inventory() {
  const [all, setAll] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [backingUp, setBackingUp] = useState(false);
  const fileRef = useRef();

  const needle = q.trim().toLowerCase();
  const rows = needle
    ? all.filter((p) =>
        [p.sku, p.name, p.category].some((s) => String(s || "").toLowerCase().includes(needle))
      )
    : all;

  async function load() {
    const data = await api("/api/products");
    setAll(data);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  function startNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
    setErr("");
  }

  function startEdit(p) {
    setEditing(p.id);
    setForm({
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      price: String(p.price),
      stock: String(p.stock),
      category: p.category,
    });
    setOpen(true);
    setErr("");
  }

  async function save(e) {
    e.preventDefault();
    setErr("");
    const body = {
      sku: form.sku,
      name: form.name,
      unit: form.unit,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      category: form.category,
    };
    try {
      if (editing) await api(`/api/products/${editing}`, { method: "PUT", body });
      else await api("/api/products", { method: "POST", body });
      setOpen(false);
      await load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function remove(p) {
    if (!confirm(`Hide ${p.name} from inventory?`)) return;
    await api(`/api/products/${p.id}`, { method: "DELETE" });
    await load();
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      setErr("");
      const res = await api("/api/products/import", { method: "POST", body: fd });
      setMsg(`Imported: ${res.created} new, ${res.updated} updated, ${res.skipped} skipped.`);
      await load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function backup() {
    setErr("");
    setMsg("");
    setBackingUp(true);
    try {
      const res = await api("/api/products/backup", { method: "POST", timeoutMs: 45_000 });
      setMsg(`Backup saved · ${res.count} SKUs · ${res.path}`);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
          <p className="text-sm text-stone-500 mt-1">
            {needle ? `${rows.length} of ${all.length}` : all.length} SKUs
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFile} />
          <button
            onClick={backup}
            disabled={backingUp}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-60"
          >
            {backingUp ? "Saving backup…" : "Create backup"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium"
          >
            Import Excel / CSV
          </button>
          <a
            href="/sample_inventory.csv"
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium"
          >
            Sample sheet
          </a>
          <button onClick={startNew} className="rounded-xl bg-ink text-white px-3 py-2 text-sm font-semibold">
            Add SKU
          </button>
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search SKU, name, category"
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 mb-4 outline-none focus:border-ink"
      />

      {msg && <p className="text-sm text-emerald-800 mb-3">{msg}</p>}
      {err && <p className="text-sm text-red-700 mb-3">{err}</p>}

      <div className="hidden md:block rounded-2xl bg-white shadow-sheet border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Stock</th>
              <th className="px-4 py-3 font-medium text-right">Rate</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-stone-500">{p.category}</td>
                <td className={`px-4 py-3 text-right ${p.stock <= 10 ? "text-orange-700 font-semibold" : ""}`}>
                  {qty(p.stock, p.unit)}
                </td>
                <td className="px-4 py-3 text-right">{inr(p.price)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(p)} className="text-ink underline mr-3">
                    Edit
                  </button>
                  <button onClick={() => remove(p)} className="text-stone-400 hover:text-red-700">
                    Hide
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                  {needle ? "No matching SKU." : "No SKUs yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {rows.map((p) => (
          <button
            key={p.id}
            onClick={() => startEdit(p)}
            className="w-full text-left rounded-2xl bg-white border border-stone-200 p-4"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {p.sku} · {p.category}
                </p>
              </div>
              <div className="text-right">
                <p>{inr(p.price)}</p>
                <p className={`text-xs ${p.stock <= 10 ? "text-orange-700" : "text-stone-500"}`}>
                  {qty(p.stock, p.unit)}
                </p>
              </div>
            </div>
          </button>
        ))}
        {!rows.length && (
          <p className="text-sm text-stone-500 px-1 py-6 text-center">
            {needle ? "No matching SKU." : "No SKUs yet."}
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form onSubmit={save} className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-2xl">{editing ? "Edit SKU" : "New SKU"}</h2>
            {[
              ["sku", "SKU"],
              ["name", "Name"],
              ["unit", "Unit (bag, kg, nos…)"],
              ["price", "Rate"],
              ["stock", "Stock"],
              ["category", "Category"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs text-stone-500">{label}</span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={key === "sku" || key === "name"}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-ink"
                />
              </label>
            ))}
            {err && <p className="text-sm text-red-700">{err}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border py-3">
                Cancel
              </button>
              <button className="flex-1 rounded-xl bg-ink text-white py-3 font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
