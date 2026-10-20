import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { buildStockWorkbook } from "@/lib/stock-import";
import { uploadSkuBackup } from "@/lib/drive";

export const preferredRegion = ["sin1"];
export const maxDuration = 30;

function istStamp() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((part) => [part.type, part.value]));
  const day = `${p.year}-${p.month}-${p.day}`;
  return { day, fileName: `sku-backup-${day}-${p.hour}${p.minute}${p.second}.xlsx` };
}

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;
  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const buf = buildStockWorkbook(
    products.map((p) => ({
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      price: p.price,
      stock: p.stock,
      category: p.category,
    }))
  );
  const { day, fileName } = istStamp();
  const uploaded = await uploadSkuBackup(buf, fileName, day);
  return NextResponse.json({ ok: true, count: products.length, ...uploaded });
}
