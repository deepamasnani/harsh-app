// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import AuthImg from "@/components/AuthImg";
import PayBox from "@/components/PayBox";
import SettleAllBox from "@/components/SettleAllBox";
import StatusBadge from "@/components/StatusBadge";
import { inr, when } from "@/lib/utils";

export default function CustomerFolder() {
  const { key } = useParams();
  const creditOnly = usePathname().startsWith("/creditors");
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState("");

  async function load() {
    const path = creditOnly ? "/api/invoices?status=credit" : "/api/invoices";
    setRows(await api(path));
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  const invoices = useMemo(() => rows.filter((r) => r.customer_key === key), [rows, key]);
  const head = invoices[0];
  const outstanding = invoices.filter((i) => i.status === "credit").reduce((s, i) => s + Number(i.balance || 0), 0);

  async function cancel(id) {
    if (!confirm("Cancel this pending bill and restore stock?")) return;
    await api(`/api/invoices/${id}/cancel`, { method: "POST" });
    await load();
  }

  if (err) return <p className="text-red-700">{err}</p>;
  if (!head) return <p className="text-stone-500">This folder is empty.</p>;

  return (
    <div>
      <Link href={creditOnly ? "/creditors" : "/invoices"} className="text-sm underline">
        All folders
      </Link>
      <p className="text-[11px] tracking-[0.22em] uppercase text-stone-500 mt-3">
        {creditOnly ? "Credit folder" : "Customer folder"}
      </p>
      <h1 className="font-display text-4xl mt-1">{head.customer_name}</h1>
      <p className="text-stone-600 mt-1">
        {head.customer_phone || "No phone"}
        {head.customer_shop && head.customer_shop !== head.customer_name ? ` · ${head.customer_shop}` : ""}
        {" · "}
        {invoices.length} {invoices.length === 1 ? "bill" : "bills"}
      </p>
      {outstanding > 0 && (
        <p className="mt-2 text-orange-900 font-semibold">Outstanding {inr(outstanding)}</p>
      )}
      {creditOnly && (
        <SettleAllBox customerKey={String(key)} outstanding={outstanding} onPaid={load} />
      )}

      <div className="mt-5 space-y-3">
        {invoices.map((inv) => (
          <div key={inv.id} className="rounded-2xl bg-white border border-stone-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-stone-500">{inv.number}</p>
                <p className="text-sm text-stone-500 mt-0.5">{when(inv.created_at)}</p>
              </div>
              <StatusBadge status={inv.status} />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>Bill</span>
              <span className="font-semibold">{inr(inv.total)}</span>
            </div>
            {inv.amount_paid > 0 && (
              <div className="flex justify-between text-sm text-stone-600">
                <span>Collected</span>
                <span>{inr(inv.amount_paid)}</span>
              </div>
            )}
            {inv.status === "credit" && (
              <div className="flex justify-between text-sm text-orange-900">
                <span>Still due</span>
                <span className="font-semibold">{inr(inv.balance)}</span>
              </div>
            )}
            {inv.status === "credit" && <PayBox invoice={inv} onPaid={load} />}
            {inv.signature_url && (
              <AuthImg src={inv.signature_url} alt="Signature" className="mt-3 h-16 object-contain bg-stone-50 rounded-lg border border-stone-200 px-2" />
            )}
            <div className="flex gap-3 mt-3 text-sm">
              <Link href={`/print/${inv.id}`} className="underline">
                View / print
              </Link>
              {inv.status === "pending" && (
                <button onClick={() => cancel(inv.id)} className="text-stone-500">
                  Cancel bill
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
