import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { inr } from "../../utils";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/dashboard").then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-700">{err}</p>;
  if (!data) return <p className="text-stone-500">Loading desk…</p>;

  const cards = [
    { label: "Today’s bills", value: data.today_bills, sub: inr(data.today_amount), to: "/invoices" },
    { label: "With staff", value: data.pending_deliveries, sub: inr(data.pending_amount), to: "/invoices" },
    { label: "Credit outstanding", value: inr(data.credit_outstanding), sub: `${data.credit_count} signed dues`, to: "/creditors" },
    { label: "SKUs on shelf", value: data.sku_count, sub: `${data.low_stock} low stock`, to: "/inventory" },
  ];

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-stone-500">Owner desk</p>
          <h1 className="font-display text-4xl mt-1">Today at the counter</h1>
        </div>
        <Link
          to="/billing"
          className="hidden sm:inline-flex rounded-xl bg-ink text-white px-4 py-2.5 text-sm font-semibold"
        >
          New bill
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-2xl bg-white shadow-sheet p-4 border border-stone-200/80 hover:border-ink/20"
          >
            <p className="text-xs text-stone-500">{c.label}</p>
            <p className="text-2xl font-semibold mt-2 tracking-tight">{c.value}</p>
            <p className="text-sm text-stone-500 mt-1">{c.sub}</p>
          </Link>
        ))}
      </div>

      <Link
        to="/billing"
        className="sm:hidden mt-6 flex items-center justify-center rounded-xl bg-ink text-white py-3.5 font-semibold"
      >
        New bill
      </Link>
    </div>
  );
}
