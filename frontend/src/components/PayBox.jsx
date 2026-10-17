import { useState } from "react";
import { api } from "../api";
import { inr } from "../utils";

export default function PayBox({ invoice, onPaid, compact }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const due = Number(invoice.balance || 0);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const n = Number(amount);
    if (!n || n <= 0) {
      setErr("Enter the amount they paid");
      return;
    }
    if (n > due + 0.001) {
      setErr(`Due is only ${inr(due)}`);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/invoices/${invoice.id}/pay`, { method: "POST", body: { amount: n } });
      setAmount("");
      onPaid?.();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  if (due <= 0) return null;

  return (
    <form onSubmit={submit} className={compact ? "mt-2" : "mt-3"}>
      <p className="text-xs text-stone-500 mb-1">Due {inr(due)} — any amount is fine</p>
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Part payment"
          className="flex-1 min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-ink"
        />
        <button
          disabled={busy}
          className="shrink-0 rounded-xl bg-ink text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {busy ? "…" : "Collect"}
        </button>
      </div>
      {err && <p className="text-xs text-red-700 mt-1">{err}</p>}
    </form>
  );
}
