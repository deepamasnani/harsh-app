"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { inr } from "@/lib/utils";

export default function SettleAllBox({
  customerKey,
  outstanding,
  onPaid,
}: {
  customerKey: string;
  outstanding: number;
  onPaid?: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function collect(n: number) {
    setErr("");
    if (!n || n <= 0) {
      setErr("Enter the amount they paid");
      return;
    }
    if (n > outstanding + 0.001) {
      setErr(`Due on this shop is only ${inr(outstanding)}`);
      return;
    }
    setBusy(true);
    try {
      await api("/api/credits/settle", {
        method: "POST",
        body: { customer_key: customerKey, amount: n, note: "Overall settlement" },
      });
      setAmount("");
      onPaid?.();
    } catch (ex: any) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  if (outstanding <= 0) return null;

  return (
    <div className="mt-4 rounded-3xl bg-white border border-slate-200 p-4">
      <p className="font-semibold">Settle overall</p>
      <p className="text-sm text-slate-500 mt-1">
        Collect one amount against this shop. Oldest credit bills are cleared first.
      </p>
      <p className="text-orange-900 font-semibold mt-2">Total due {inr(outstanding)}</p>
      <div className="flex gap-2 mt-3">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Any amount"
          className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-ink"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => collect(Number(amount))}
          className="shrink-0 rounded-xl bg-ink text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {busy ? "…" : "Collect"}
        </button>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => collect(outstanding)}
        className="mt-2 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        Pay in full {inr(outstanding)}
      </button>
      {err && <p className="text-xs text-red-700 mt-2">{err}</p>}
    </div>
  );
}
