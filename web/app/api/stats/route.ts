import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money, monthBoundsIst } from "@/lib/money";

export const preferredRegion = ["sin1"];

function n(value: unknown) {
  return Number(value || 0);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const ym = req.nextUrl.searchParams.get("month") || "";
  const all = ym === "all";
  const bounds = all ? null : monthBoundsIst(ym || undefined);

  const months = await prisma.$queryRaw<{ month: string; bills: unknown; sale: unknown }[]>`
    SELECT to_char(timezone('Asia/Kolkata', "createdAt"), 'YYYY-MM') AS month,
           COUNT(*)::int AS bills,
           COALESCE(SUM(total), 0) AS sale
    FROM "Invoice"
    WHERE status <> 'cancelled'
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 18
  `;

  const returnMonths = await prisma.$queryRaw<{ month: string; ret: unknown }[]>`
    SELECT to_char(timezone('Asia/Kolkata', "createdAt"), 'YYYY-MM') AS month,
           COALESCE(SUM(amount), 0) AS ret
    FROM "StockReturn"
    GROUP BY 1
  `;
  const retByMonth = new Map(returnMonths.map((r) => [r.month, n(r.ret)]));

  const productRows = bounds
    ? await prisma.$queryRaw<{ sku: string; name: string; qty: unknown; sale: unknown; stock: unknown }[]>`
        SELECT COALESCE(ii.sku, '') AS sku,
               ii.name,
               COALESCE(SUM(ii.quantity), 0) AS qty,
               COALESCE(SUM(ii."lineTotal"), 0) AS sale,
               MAX(p.stock) AS stock
        FROM "InvoiceItem" ii
        INNER JOIN "Invoice" i ON i.id = ii."invoiceId"
        LEFT JOIN "Product" p ON p.id = ii."productId"
        WHERE i.status <> 'cancelled'
          AND i."createdAt" >= ${bounds.start}
          AND i."createdAt" < ${bounds.end}
        GROUP BY ii.sku, ii.name
        ORDER BY sale DESC
        LIMIT 100
      `
    : await prisma.$queryRaw<{ sku: string; name: string; qty: unknown; sale: unknown; stock: unknown }[]>`
        SELECT COALESCE(ii.sku, '') AS sku,
               ii.name,
               COALESCE(SUM(ii.quantity), 0) AS qty,
               COALESCE(SUM(ii."lineTotal"), 0) AS sale,
               MAX(p.stock) AS stock
        FROM "InvoiceItem" ii
        INNER JOIN "Invoice" i ON i.id = ii."invoiceId"
        LEFT JOIN "Product" p ON p.id = ii."productId"
        WHERE i.status <> 'cancelled'
        GROUP BY ii.sku, ii.name
        ORDER BY sale DESC
        LIMIT 100
      `;

  const returnProducts = bounds
    ? await prisma.$queryRaw<{ sku: string; name: string; qty: unknown; sale: unknown }[]>`
        SELECT sku, name, COALESCE(SUM(quantity), 0) AS qty, COALESCE(SUM(amount), 0) AS sale
        FROM "StockReturn"
        WHERE "createdAt" >= ${bounds.start} AND "createdAt" < ${bounds.end}
        GROUP BY sku, name
      `
    : await prisma.$queryRaw<{ sku: string; name: string; qty: unknown; sale: unknown }[]>`
        SELECT sku, name, COALESCE(SUM(quantity), 0) AS qty, COALESCE(SUM(amount), 0) AS sale
        FROM "StockReturn"
        GROUP BY sku, name
      `;

  const totals = bounds
    ? await prisma.$queryRaw<{ bills: unknown; sale: unknown; credit: unknown; returns: unknown }[]>`
        SELECT
          (SELECT COUNT(*)::int FROM "Invoice" WHERE status <> 'cancelled' AND "createdAt" >= ${bounds.start} AND "createdAt" < ${bounds.end}) AS bills,
          (SELECT COALESCE(SUM(total), 0) FROM "Invoice" WHERE status <> 'cancelled' AND "createdAt" >= ${bounds.start} AND "createdAt" < ${bounds.end}) AS sale,
          (SELECT COALESCE(SUM(GREATEST(total - "amountPaid", 0)), 0) FROM "Invoice" WHERE status = 'credit') AS credit,
          (SELECT COALESCE(SUM(amount), 0) FROM "StockReturn" WHERE "createdAt" >= ${bounds.start} AND "createdAt" < ${bounds.end}) AS returns
      `
    : await prisma.$queryRaw<{ bills: unknown; sale: unknown; credit: unknown; returns: unknown }[]>`
        SELECT
          (SELECT COUNT(*)::int FROM "Invoice" WHERE status <> 'cancelled') AS bills,
          (SELECT COALESCE(SUM(total), 0) FROM "Invoice" WHERE status <> 'cancelled') AS sale,
          (SELECT COALESCE(SUM(GREATEST(total - "amountPaid", 0)), 0) FROM "Invoice" WHERE status = 'credit') AS credit,
          (SELECT COALESCE(SUM(amount), 0) FROM "StockReturn") AS returns
      `;

  const t = totals[0] || { bills: 0, sale: 0, credit: 0, returns: 0 };
  const retMap = new Map(returnProducts.map((r) => [`${r.sku}|${r.name}`, r]));
  const products = productRows.map((p) => {
    const hit = retMap.get(`${p.sku}|${p.name}`);
    return {
      sku: p.sku,
      name: p.name,
      qty: n(p.qty) - n(hit?.qty),
      sale: money(n(p.sale) - n(hit?.sale)),
      stock: n(p.stock),
    };
  });
  const top = [...products].sort((a, b) => b.sale - a.sale)[0] || null;

  return NextResponse.json({
    month: all ? "all" : bounds!.key,
    month_label: all ? "All time" : bounds!.label,
    bills: n(t.bills),
    sale: money(n(t.sale) - n(t.returns)),
    credit: money(n(t.credit)),
    top,
    months: months.map((m) => ({
      month: m.month,
      label: monthLabel(m.month),
      bills: n(m.bills),
      sale: money(n(m.sale) - (retByMonth.get(m.month) || 0)),
    })),
    products,
  });
}
