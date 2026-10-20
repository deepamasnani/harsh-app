// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import AuthImg from "@/components/AuthImg";
import PayBox from "@/components/PayBox";
import SettleAllBox from "@/components/SettleAllBox";
import StatusBadge from "@/components/StatusBadge";
import ReturnBox from "@/components/ReturnBox";
import { inr, qty, when } from "@/lib/utils";

export default function CustomerPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("bills");

  async function load() {
    setData(await api(`/api/customers/${id}`));
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [id]);

  const bills = data?.invoices || [];
  const credits = useMemo(() => bills.filter((i) => i.status === "credit"), [bills]);
  const returns = data?.returns || [];

  async function cancel(invoiceId) {
    if (!confirm("Cancel this pending bill and restore stock?")) return;
    await api(`/api/invoices/${invoiceId}/cancel`, { method: "POST" });
    await load();
  }

  if (err) return <p className="text-red-700">{err}</p>;
  if (!data) return <p className="text-slate-500">Loading customer…</p>;

  return (
    <div>
      <Link href="/customers" className="text-sm underline">
        All customers
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-3">{data.name}</h1>
      <p className="text-slate-500 text-sm mt-1">
        {data.phone || "No phone"}
        {data.shop && data.shop !== data.name ? ` · ${data.shop}` : ""}
      </p>
      {data.credit_outstanding > 0 && (
        <p className="mt-2 text-orange-900 font-semibold">Credit due {inr(data.credit_outstanding)}</p>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          href={`/billing?name=${encodeURIComponent(data.name)}&phone=${encodeURIComponent(data.phone)}&shop=${encodeURIComponent(data.shop)}`}
          className="flex-1 rounded-2xl bg-brass-600 text-white py-3 text-sm font-semibold text-center"
        >
          New bill
        </Link>
        <ReturnBox customerId={data.id} onDone={load} />
      </div>

      {data.credit_outstanding > 0 && (
        <SettleAllBox customerKey={data.customer_key} outstanding={data.credit_outstanding} onPaid={load} />
      )}

      <div className="flex gap-2 overflow-x-auto mt-5 mb-3">
        {[
          { id: "bills", label: `Bills · ${bills.length}` },
          { id: "credit", label: `Credit · ${credits.length}` },
          { id: "returns", label: `Returns · ${returns.length}` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
              tab === t.id ? "bg-ink text-white" : "bg-white border border-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "returns" && (
        <div className="space-y-3">
          {(tab === "credit" ? credits : bills).map((inv) => (
            <div key={inv.id} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-slate-500">{inv.number}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{when(inv.created_at)}</p>
                </div>
                <StatusBadge status={inv.status} />
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>Bill</span>
                <span className="font-semibold">{inr(inv.total)}</span>
              </div>
              {inv.amount_paid > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
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
                <AuthImg
                  src={inv.signature_url}
                  alt="Signature"
                  className="mt-3 h-16 object-contain bg-slate-50 rounded-lg border border-slate-200 px-2"
                />
              )}
              <div className="flex gap-3 mt-3 text-sm">
                <Link href={`/print/${inv.id}`} className="underline">
                  View / print
                </Link>
                {inv.status === "pending" && (
                  <button onClick={() => cancel(inv.id)} className="text-slate-500">
                    Cancel bill
                  </button>
                )}
              </div>
            </div>
          ))}
          {!(tab === "credit" ? credits : bills).length && (
            <p className="text-slate-500 text-sm">{tab === "credit" ? "No open credit." : "No bills yet."}</p>
          )}
        </div>
      )}

      {tab === "returns" && (
        <div className="space-y-2">
          {returns.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white border border-slate-200 px-4 py-3">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{r.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {r.sku} · {qty(r.quantity, r.unit)} · {when(r.created_at)}
                  </p>
                </div>
                <p className="font-semibold shrink-0">-{inr(r.amount)}</p>
              </div>
            </div>
          ))}
          {!returns.length && <p className="text-slate-500 text-sm">No returns yet.</p>}
        </div>
      )}
    </div>
  );
}
