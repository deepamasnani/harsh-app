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
  if (s === "stock" || s === "sheet1") return "General";
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

type Cols = { sku: number; name: number; unit: number; price: number; stock: number; category: number };

function headerCols(row: (string | number | null)[] | undefined): Cols | null {
  if (!row) return null;
  const cells = row.map((c) => String(c ?? "").trim().toLowerCase());
  const find = (...names: string[]) => {
    const i = cells.findIndex((c) => names.includes(c));
    return i;
  };
  const name = find("name", "item", "item name");
  const sku = find("sku", "code", "item code");
  const stock = find("stock", "stock count", "qty", "quantity", "boxes");
  const looksLikeHeader = cells.some((c) =>
    ["sku", "name", "item name", "stock", "stock count", "category", "price", "rate", "unit"].includes(c)
  );
  if (!looksLikeHeader || name < 0) return null;
  if (sku < 0 && stock < 0) return null;
  return {
    sku,
    name,
    unit: find("unit"),
    price: find("price", "rate"),
    stock,
    category: find("category"),
  };
}

function put(merged: Map<string, ImportedProduct>, row: ImportedProduct, addStock: boolean) {
  const existing = merged.get(row.sku);
  if (!existing) {
    merged.set(row.sku, row);
    return;
  }
  if (addStock) existing.stock += row.stock;
  else Object.assign(existing, row);
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

    let cols: Cols | null = null;
    let start = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const found = headerCols(rows[i]);
      if (found) {
        cols = found;
        start = i + 1;
        break;
      }
    }

    if (cols) {
      for (let i = start; i < rows.length; i++) {
        const row = rows[i];
        const name = cleanName(row?.[cols.name]);
        if (!name) continue;
        const sku =
          cols.sku >= 0
            ? cleanName(row?.[cols.sku]).toUpperCase().slice(0, 80)
            : skuFromName(prefix, name);
        if (!sku) continue;
        put(
          merged,
          {
            sku,
            name,
            unit: cols.unit >= 0 && cleanName(row?.[cols.unit]) ? cleanName(row?.[cols.unit]) : unit,
            price: cols.price >= 0 ? num(row?.[cols.price]) : 0,
            stock: cols.stock >= 0 ? num(row?.[cols.stock]) : 0,
            category:
              cols.category >= 0 && cleanName(row?.[cols.category])
                ? cleanName(row?.[cols.category])
                : category,
          },
          false
        );
      }
      continue;
    }

    for (const row of rows) {
      const name = cleanName(row?.[0]);
      if (!name || HEADER.has(name.toLowerCase())) continue;
      const stock = num(row?.[1]);
      const sku = skuFromName(prefix, name);
      put(merged, { sku, name, unit, price: 0, stock, category }, true);
    }
  }

  return [...merged.values()];
}

export function buildStockWorkbook(products: ImportedProduct[]): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["sku", "name", "unit", "price", "stock", "category"],
    ...products.map((p) => [p.sku, p.name, p.unit, p.price, p.stock, p.category]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 18 }, { wch: 42 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Stock");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
