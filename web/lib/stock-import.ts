import * as XLSX from "xlsx";

const HEADER = new Set([
  "item name",
  "stock count",
  "range",
  "boxes",
  "quantity",
  "qty",
  "name",
  "item",
]);

export type ImportedProduct = {
  sku: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  category: string;
};

function num(val: unknown) {
  if (val == null || val === "") return 0;
  const n = Number(String(val).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function cleanName(val: unknown) {
  return String(val ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function sheetCategory(sheet: string) {
  const s = sheet.toLowerCase();
  if (s.includes("glass")) return "Glass band";
  if (s.includes("wood")) return "Woodtek";
  if (s.includes("pvc")) return "PVC band";
  return sheet.trim() || "General";
}

function sheetUnit(sheet: string) {
  return sheet.toLowerCase().includes("wood") ? "box" : "roll";
}

export function skuFromName(prefix: string, name: string) {
  const trimmed = name.trim();
  const coded = trimmed.match(/^(\d+)\s+(.+)$/);
  if (coded) {
    const rest = coded[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${coded[1]}${rest ? "-" + rest : ""}`.toUpperCase().slice(0, 80);
  }
  if (/^[0-9A-Z][0-9A-Z.-]{2,}$/i.test(trimmed) && trimmed.length <= 24) {
    return trimmed.toUpperCase();
  }
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  return `${prefix}-${slug}`.toUpperCase().slice(0, 80);
}

export function parseStockWorkbook(buf: Buffer): ImportedProduct[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const merged = new Map<string, ImportedProduct>();

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(wb.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: true,
    });
    const category = sheetCategory(sheetName);
    const unit = sheetUnit(sheetName);
    const prefix = category.replace(/\s+/g, "").slice(0, 8).toUpperCase() || "ITEM";

    for (const row of rows) {
      const name = cleanName(row?.[0]);
      if (!name || HEADER.has(name.toLowerCase())) continue;
      const stock = num(row?.[1]);
      const sku = skuFromName(prefix, name);
      const existing = merged.get(sku);
      if (existing) {
        existing.stock += stock;
        continue;
      }
      merged.set(sku, { sku, name, unit, price: 0, stock, category });
    }
  }

  return [...merged.values()];
}
