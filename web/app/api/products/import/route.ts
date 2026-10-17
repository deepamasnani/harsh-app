import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import * as XLSX from "xlsx";

function cell(row: Record<string, unknown>, keys: string[], fallback = "") {
  const map = Object.fromEntries(Object.entries(row).map(([k, v]) => [String(k).trim().toLowerCase(), v]));
  for (const k of keys) {
    if (map[k] != null && map[k] !== "") return map[k];
  }
  return fallback;
}

function num(val: unknown, fallback = 0) {
  if (val == null || val === "") return fallback;
  const n = Number(String(val).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "Upload a .xlsx or .csv file" }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, unknown>[] = [];
  if (name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet);
  } else {
    return NextResponse.json({ detail: "Upload a .xlsx or .csv file" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const sku = String(cell(row, ["sku", "item code", "code", "item_code"]) || "").trim().toUpperCase();
    const pname = String(cell(row, ["name", "item", "product", "description"]) || "").trim();
    if (!sku || !pname) {
      skipped += 1;
      continue;
    }
    const unit = String(cell(row, ["unit", "uom"], "pcs")).trim() || "pcs";
    const price = num(cell(row, ["price", "rate", "mrp", "selling_price"]));
    const stock = num(cell(row, ["stock", "qty", "quantity", "qty_on_hand"]));
    const category = String(cell(row, ["category", "group"], "General")).trim() || "General";
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { name: pname, unit, price, stock, category, isActive: true },
      });
      updated += 1;
    } else {
      await prisma.product.create({ data: { sku, name: pname, unit, price, stock, category } });
      created += 1;
    }
  }
  return NextResponse.json({ created, updated, skipped, total: rows.length });
}
