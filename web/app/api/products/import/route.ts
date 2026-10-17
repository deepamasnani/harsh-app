import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseStockWorkbook } from "@/lib/stock-import";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "Upload a .xlsx or .csv file" }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  if (!(name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls"))) {
    return NextResponse.json({ detail: "Upload a .xlsx or .csv file" }, { status: 400 });
  }
  const products = parseStockWorkbook(Buffer.from(await file.arrayBuffer()));
  let created = 0;
  let updated = 0;
  for (const row of products) {
    const existing = await prisma.product.findUnique({ where: { sku: row.sku } });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { ...row, isActive: true },
      });
      updated += 1;
    } else {
      await prisma.product.create({ data: row });
      created += 1;
    }
  }
  return NextResponse.json({ created, updated, skipped: 0, total: products.length });
}
