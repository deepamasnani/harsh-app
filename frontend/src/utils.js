export function inr(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

export function qty(n, unit) {
  const v = Number(n);
  const shown = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
  return unit ? `${shown} ${unit}` : shown;
}

export function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relative(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export const STATUS = {
  pending: { label: "With staff", className: "bg-amber-100 text-amber-900" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-900" },
  credit: { label: "Credit", className: "bg-orange-100 text-orange-950" },
  settled: { label: "Settled", className: "bg-stone-200 text-stone-700" },
  cancelled: { label: "Cancelled", className: "bg-stone-100 text-stone-500" },
};

export function groupFolders(invoices) {
  const map = new Map();
  for (const inv of invoices) {
    const key = inv.customer_key || `id-${inv.id}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: inv.customer_name || inv.customer_shop,
        customer_name: inv.customer_name,
        phone: inv.customer_phone,
        invoices: [],
      });
    }
    map.get(key).invoices.push(inv);
  }
  return [...map.values()].map((f) => {
    const outstanding = f.invoices
      .filter((i) => i.status === "credit")
      .reduce((s, i) => s + Number(i.balance || 0), 0);
    const pending = f.invoices.filter((i) => i.status === "pending").length;
    return { ...f, count: f.invoices.length, pending, outstanding };
  });
}
