import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { inr, qty, when } from "../../utils";
import { useAuth } from "../../auth.jsx";
import AuthImg, { openAuthedFile } from "../../components/AuthImg.jsx";

export default function InvoicePrint() {
  const { id } = useParams();
  const { user } = useAuth();
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api(`/api/invoices/${id}`).then(setInv).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <p className="p-6 text-red-700">{err}</p>;
  if (!inv) return <p className="p-6 text-stone-500">Loading bill…</p>;

  const shop = inv.shop || {};
  const back = user?.role === "staff"
    ? (inv.customer_key ? `/staff/customer/${encodeURIComponent(inv.customer_key)}` : `/staff/receipt/${inv.id}`)
    : (inv.customer_key ? `/invoices/customer/${encodeURIComponent(inv.customer_key)}` : "/invoices");

  return (
    <div className="min-h-screen bg-paper">
      <div className="no-print max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to={back} className="text-sm underline">
          Back
        </Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="rounded-xl bg-ink text-white px-4 py-2 text-sm font-semibold">
            Print
          </button>
          {inv.pdf_url && (
            <button
              onClick={() => openAuthedFile(inv.pdf_url)}
              className="rounded-xl border border-ink px-4 py-2 text-sm font-semibold"
            >
              PDF
            </button>
          )}
        </div>
      </div>

      <article className="print-sheet max-w-2xl mx-auto bg-white shadow-sheet mx-4 mb-10 p-6 sm:p-10 text-ink">
        <header className="flex justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <p className="font-display text-3xl">{shop.name}</p>
            <p className="text-xs tracking-widest uppercase text-stone-500 mt-1">{shop.tagline}</p>
            <p className="text-sm text-stone-600 mt-2">
              {shop.address}
              <br />
              {shop.phone}
              {shop.gstin ? <><br />GSTIN {shop.gstin}</> : null}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-stone-500">Invoice</p>
            <p className="font-mono font-semibold">{inv.number}</p>
            <p className="text-sm text-stone-500 mt-1">{when(inv.created_at)}</p>
            <p className="text-sm mt-2 capitalize">{inv.status === "pending" ? "With staff" : inv.status}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-500">Bill to</p>
            <p className="font-semibold text-lg">{inv.customer_name}</p>
            {inv.customer_shop && inv.customer_shop !== inv.customer_name && (
              <p>{inv.customer_shop}</p>
            )}
            {inv.customer_phone && <p>{inv.customer_phone}</p>}
          </div>
          {inv.notes && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-500">Notes</p>
              <p>{inv.notes}</p>
            </div>
          )}
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-ink text-left">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium text-right">Rate</th>
              <th className="py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items?.map((it) => (
              <tr key={it.id} className="border-b border-stone-200">
                <td className="py-2">
                  <span className="font-medium">{it.name}</span>
                  <span className="block text-[11px] text-stone-500">{it.sku}</span>
                </td>
                <td className="py-2 text-right whitespace-nowrap">{qty(it.quantity, it.unit)}</td>
                <td className="py-2 text-right">{inr(it.unit_price)}</td>
                <td className="py-2 text-right">{inr(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-4">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total</span>
              <span className="font-semibold text-lg">{inr(inv.total)}</span>
            </div>
            {inv.amount_paid > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Received</span>
                <span>{inr(inv.amount_paid)}</span>
              </div>
            )}
            {inv.balance > 0 && inv.status === "credit" && (
              <div className="flex justify-between text-orange-900 font-semibold">
                <span>Balance due</span>
                <span>{inr(inv.balance)}</span>
              </div>
            )}
            <p className="text-[11px] text-stone-500 mt-2 italic">{inv.amount_words}</p>
          </div>
        </div>

        <section className="mt-8 grid sm:grid-cols-2 gap-6 items-end">
          <div className="min-h-[90px] border-t border-stone-300 pt-2">
            <p className="text-[10px] uppercase tracking-widest text-stone-500">Customer signature (credit)</p>
            {inv.signature_url ? (
              <AuthImg src={inv.signature_url} alt="Signature" className="h-20 object-contain mt-2 bg-paper" />
            ) : (
              <p className="text-sm text-stone-400 mt-6">No signature</p>
            )}
          </div>
          <div className="text-right text-xs text-stone-500">
            {inv.payments?.length > 0 && (
              <div className="mb-2 text-left">
                {inv.payments.map((p) => (
                  <p key={p.id}>
                    {p.kind === "delivery" ? "On delivery" : "Part payment"} {inr(p.amount)}
                  </p>
                ))}
              </div>
            )}
            {inv.delivered_at && <p>Delivered {when(inv.delivered_at)}</p>}
            {inv.settled_at && <p>Settled {when(inv.settled_at)}</p>}
            <p className="mt-3">Goods once sold are subject to shop terms.</p>
          </div>
        </section>
      </article>
    </div>
  );
}
