import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import SignaturePad from "../../components/SignaturePad.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import AuthImg from "../../components/AuthImg.jsx";
import { inr, qty } from "../../utils";

export default function ReceiptDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState(null);
  const [mode, setMode] = useState(null);
  const [sig, setSig] = useState(null);
  const [cashNow, setCashNow] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setInv(await api(`/api/invoices/${id}`));
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [id]);

  useEffect(() => {
    document.body.classList.toggle("signing", mode === "credit");
    return () => document.body.classList.remove("signing");
  }, [mode]);

  const cash = Number(cashNow) || 0;
  const creditDue = inv ? Math.max(0, Number(inv.total) - cash) : 0;

  async function deliver(payment) {
    setErr("");
    const part = payment === "credit" ? cash : Number(inv.total);
    if (payment === "credit" && creditDue > 0 && !sig) {
      setErr("Ask the customer to sign for the remaining credit");
      return;
    }
    if (payment === "credit" && cash > Number(inv.total) + 0.001) {
      setErr("Part payment cannot be more than the bill");
      return;
    }
    setBusy(true);
    try {
      const next = await api(`/api/invoices/${id}/deliver`, {
        method: "POST",
        body: {
          payment: creditDue <= 0 ? "paid" : payment,
          signature: payment === "credit" && creditDue > 0 ? sig : null,
          amount_paid: part,
        },
      });
      setInv(next);
      setMode(null);
      nav(next.customer_key ? `/staff/customer/${encodeURIComponent(next.customer_key)}` : "/staff");
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  if (err && !inv) return <p className="text-red-700">{err}</p>;
  if (!inv) return <p className="text-stone-500">Loading receipt…</p>;

  const pending = inv.status === "pending";
  const folderTo = inv.customer_key ? `/staff/customer/${encodeURIComponent(inv.customer_key)}` : "/staff";

  return (
    <div>
      <Link to={folderTo} className="text-sm underline">
        Back to folder
      </Link>
      <div className="flex items-start justify-between gap-3 mt-3">
        <div>
          <p className="font-mono text-xs text-stone-500">{inv.number}</p>
          <h1 className="font-display text-3xl leading-tight mt-1">{inv.customer_name}</h1>
          <p className="text-stone-500 text-sm mt-1">
            {inv.customer_shop && inv.customer_shop !== inv.customer_name ? `${inv.customer_shop} · ` : ""}
            {inv.customer_phone || "No phone"}
          </p>
        </div>
        <StatusBadge status={inv.status} />
      </div>

      <ul className="mt-5 rounded-2xl bg-white border border-stone-200 divide-y">
        {inv.items?.map((it) => (
          <li key={it.id} className="px-4 py-3 flex justify-between gap-3">
            <div>
              <p className="font-medium">{it.name}</p>
              <p className="text-xs text-stone-500">{qty(it.quantity, it.unit)}</p>
            </div>
            <p>{inr(it.line_total)}</p>
          </li>
        ))}
      </ul>
      <p className="text-right font-display text-3xl mt-3">{inr(inv.total)}</p>
      {inv.amount_paid > 0 && (
        <p className="text-right text-sm text-stone-600">Collected {inr(inv.amount_paid)}</p>
      )}

      {inv.payments?.length > 0 && (
        <ul className="mt-3 text-sm text-stone-600 space-y-1">
          {inv.payments.map((p) => (
            <li key={p.id}>
              {p.kind === "delivery" ? "On delivery" : "Later"} · {inr(p.amount)}
            </li>
          ))}
        </ul>
      )}

      {inv.signature_url && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Credit signature</p>
          <AuthImg src={inv.signature_url} alt="Signature" className="w-full rounded-xl border bg-white" />
        </div>
      )}

      {pending && mode === null && (
        <div className="mt-6 space-y-3">
          <button
            onClick={() => deliver("paid")}
            disabled={busy}
            className="w-full rounded-2xl bg-emerald-700 text-white py-4 text-lg font-semibold disabled:opacity-60"
          >
            {busy ? "Saving…" : "Collected full cash"}
          </button>
          <button
            onClick={() => setMode("credit")}
            className="w-full rounded-2xl bg-ink text-white py-4 text-lg font-semibold"
          >
            Part payment / credit
          </button>
        </div>
      )}

      {pending && mode === "credit" && (
        <div className="fixed inset-0 z-50 bg-paper flex flex-col">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <button onClick={() => setMode(null)} className="text-sm underline">
              Back
            </button>
            <p className="text-xs tracking-widest uppercase text-stone-500">{inv.number}</p>
          </div>
          <div className="px-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
            <h2 className="font-display text-2xl">Part payment</h2>
            <p className="text-stone-600 text-sm mt-1">Bill {inr(inv.total)}. Enter cash taken now — the rest is credit.</p>
            <label className="block mt-3 text-xs text-stone-500">Cash collected now</label>
            <input
              inputMode="decimal"
              value={cashNow}
              onChange={(e) => setCashNow(e.target.value)}
              placeholder="0 if nothing today"
              className="w-full rounded-xl border-2 border-ink bg-white px-3 py-3 outline-none mt-1"
            />
            <p className="mt-2 font-semibold text-orange-900">
              Credit to sign: {inr(creditDue)}
            </p>
            {creditDue > 0 ? (
              <>
                <p className="text-sm text-stone-600 mt-4 mb-2">Hand the phone to the customer for the remaining amount.</p>
                <SignaturePad onChange={setSig} />
              </>
            ) : (
              <p className="text-sm text-emerald-800 mt-4">That covers the whole bill — no signature needed.</p>
            )}
            {err && <p className="text-red-700 text-sm mt-2">{err}</p>}
            <button
              onClick={() => deliver("credit")}
              disabled={busy || (creditDue > 0 && !sig)}
              className="mt-4 mb-6 w-full rounded-2xl bg-brass-500 text-ink py-4 text-lg font-semibold disabled:opacity-50"
            >
              {busy ? "Saving…" : creditDue > 0 ? "Save as credit" : "Save as paid"}
            </button>
          </div>
        </div>
      )}

      {!pending && (
        <Link to={`/print/${inv.id}`} className="mt-6 block text-center underline">
          Open printable copy
        </Link>
      )}
    </div>
  );
}
