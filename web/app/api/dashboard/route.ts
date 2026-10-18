import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money, todayBoundsUtc } from "@/lib/money";

export const preferredRegion = ["sin1"];

function n(value: unknown) {
  return Number(value || 0);
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const { start } = todayBoundsUtc();
  const rows = await prisma.$queryRaw<
    {
      today_bills: unknown;
      today_amount: unknown;
      pending_deliveries: unknown;
      pending_amount: unknown;
      credit_count: unknown;
      credit_outstanding: unknown;
      low_stock: unknown;
      sku_count: unknown;
    }[]
  >`
    SELECT
      (SELECT COUNT(*) FROM "Invoice" WHERE "createdAt" >= ${start} AND status <> 'cancelled') AS today_bills,
      (SELECT COALESCE(SUM(total), 0) FROM "Invoice" WHERE "createdAt" >= ${start} AND status <> 'cancelled') AS today_amount,
      (SELECT COUNT(*) FROM "Invoice" WHERE status = 'pending') AS pending_deliveries,
      (SELECT COALESCE(SUM(total), 0) FROM "Invoice" WHERE status = 'pending') AS pending_amount,
      (SELECT COUNT(*) FROM "Invoice" WHERE status = 'credit') AS credit_count,
      (SELECT COALESCE(SUM(GREATEST(total - "amountPaid", 0)), 0) FROM "Invoice" WHERE status = 'credit') AS credit_outstanding,
      (SELECT COUNT(*) FROM "Product" WHERE "isActive" = true AND stock <= 10) AS low_stock,
      (SELECT COUNT(*) FROM "Product" WHERE "isActive" = true) AS sku_count
  `;
  const row = rows[0] || {};
  return NextResponse.json({
    today_bills: n(row.today_bills),
    today_amount: money(n(row.today_amount)),
    pending_deliveries: n(row.pending_deliveries),
    pending_amount: money(n(row.pending_amount)),
    credit_count: n(row.credit_count),
    credit_outstanding: money(n(row.credit_outstanding)),
    low_stock: n(row.low_stock),
    sku_count: n(row.sku_count),
  });
}
