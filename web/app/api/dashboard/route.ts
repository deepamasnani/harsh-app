import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money, monthBoundsIst, todayBoundsUtc } from "@/lib/money";

export const preferredRegion = ["sin1"];
export const maxDuration = 30;

function n(value: unknown) {
  return Number(value || 0);
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const { start } = todayBoundsUtc();
  const month = monthBoundsIst();
  const [rows, top] = await Promise.all([
    prisma.$queryRaw<
      {
        today_bills: unknown;
        today_amount: unknown;
        pending_deliveries: unknown;
        pending_amount: unknown;
        credit_count: unknown;
        credit_outstanding: unknown;
        low_stock: unknown;
        sku_count: unknown;
        month_bills: unknown;
        month_amount: unknown;
        today_returns: unknown;
        month_returns: unknown;
      }[]
    >`
      SELECT
        (SELECT COUNT(*) FROM "Invoice" WHERE "createdAt" >= ${start} AND status <> 'cancelled') AS today_bills,
        (SELECT COALESCE(SUM(total), 0) FROM "Invoice" WHERE "createdAt" >= ${start} AND status <> 'cancelled') AS today_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM "StockReturn" WHERE "createdAt" >= ${start}) AS today_returns,
        (SELECT COUNT(*) FROM "Invoice" WHERE status = 'pending') AS pending_deliveries,
        (SELECT COALESCE(SUM(total), 0) FROM "Invoice" WHERE status = 'pending') AS pending_amount,
        (SELECT COUNT(*) FROM "Invoice" WHERE status = 'credit') AS credit_count,
        (SELECT COALESCE(SUM(GREATEST(total - "amountPaid", 0)), 0) FROM "Invoice" WHERE status = 'credit') AS credit_outstanding,
        (SELECT COUNT(*) FROM "Product" WHERE "isActive" = true AND stock <= 10) AS low_stock,
        (SELECT COUNT(*) FROM "Product" WHERE "isActive" = true) AS sku_count,
        (SELECT COUNT(*) FROM "Invoice" WHERE "createdAt" >= ${month.start} AND "createdAt" < ${month.end} AND status <> 'cancelled') AS month_bills,
        (SELECT COALESCE(SUM(total), 0) FROM "Invoice" WHERE "createdAt" >= ${month.start} AND "createdAt" < ${month.end} AND status <> 'cancelled') AS month_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM "StockReturn" WHERE "createdAt" >= ${month.start} AND "createdAt" < ${month.end}) AS month_returns
    `,
    prisma.$queryRaw<{ name: string; sku: string; qty: unknown; sale: unknown }[]>`
      SELECT name, sku, COALESCE(SUM(qty), 0) AS qty, COALESCE(SUM(sale), 0) AS sale
      FROM (
        SELECT ii.name, COALESCE(ii.sku, '') AS sku, ii.quantity AS qty, ii."lineTotal" AS sale
        FROM "InvoiceItem" ii
        INNER JOIN "Invoice" i ON i.id = ii."invoiceId"
        WHERE i.status <> 'cancelled'
          AND i."createdAt" >= ${month.start}
          AND i."createdAt" < ${month.end}
        UNION ALL
        SELECT r.name, r.sku, -r.quantity AS qty, -r.amount AS sale
        FROM "StockReturn" r
        WHERE r."createdAt" >= ${month.start}
          AND r."createdAt" < ${month.end}
      ) x
      GROUP BY name, sku
      ORDER BY sale DESC
      LIMIT 1
    `,
  ]);
  const row = rows[0] || {};
  const best = top[0];
  return NextResponse.json({
    today_bills: n(row.today_bills),
    today_amount: money(n(row.today_amount) - n(row.today_returns)),
    pending_deliveries: n(row.pending_deliveries),
    pending_amount: money(n(row.pending_amount)),
    credit_count: n(row.credit_count),
    credit_outstanding: money(n(row.credit_outstanding)),
    low_stock: n(row.low_stock),
    sku_count: n(row.sku_count),
    month_label: month.label,
    month_bills: n(row.month_bills),
    month_amount: money(n(row.month_amount) - n(row.month_returns)),
    top_product: best
      ? { name: best.name, sku: best.sku, qty: n(best.qty), sale: money(n(best.sale)) }
      : null,
  });
}
