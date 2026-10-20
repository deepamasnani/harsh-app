export function money(n: unknown) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function nameKey(name: string) {
  return (name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function customerKey(name: string, _phone = "", customerId?: number | null) {
  if (customerId) return `c-${customerId}`;
  const slug = nameKey(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `n-${slug || "unknown"}`;
}

export function folderSlug(name: string) {
  const raw = (name || "").trim().replace(/[^\w]+/g, "_");
  return raw.replace(/^_+|_+$/g, "") || "unknown";
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigit(n: number) {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "")).trim();
}

function threeDigit(n: number) {
  if (n < 100) return twoDigit(n);
  const rest = twoDigit(n % 100);
  return (ONES[Math.floor(n / 100)] + " Hundred" + (rest ? " " + rest : "")).trim();
}

export function amountInWords(amount: number) {
  let n = Math.round(amount);
  if (n === 0) return "Zero Rupees only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;
  if (crore) parts.push(threeDigit(crore) + " Crore");
  if (lakh) parts.push(twoDigit(lakh) + " Lakh");
  if (thousand) parts.push(twoDigit(thousand) + " Thousand");
  if (n) parts.push(threeDigit(n));
  return parts.join(" ") + " Rupees only";
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function todayBoundsUtc() {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  const startIst = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = new Date(startIst - IST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function monthBoundsIst(ym?: string) {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    year = Number(ym.slice(0, 4));
    month = Number(ym.slice(5, 7)) - 1;
  }
  const start = new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month + 1, 1) - IST_OFFSET_MS);
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  const label = new Date(Date.UTC(year, month, 1)).toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, key, label, year, month };
}

export function isToday(dt: Date | null | undefined) {
  if (!dt) return false;
  const { start, end } = todayBoundsUtc();
  const t = dt.getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function staffCanSeeInvoice(inv: { status: string; createdAt: Date; deliveredAt?: Date | null }) {
  if (inv.status === "cancelled") return false;
  if (inv.status === "pending") return true;
  return isToday(inv.createdAt) || isToday(inv.deliveredAt);
}
