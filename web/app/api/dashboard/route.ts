import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money, todayBoundsUtc } from "@/lib/money";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const { start } = todayBoundsUtc();
  const [today, pending, credit, lowStock, skuCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { createdAt: { gte: start }, status: { not: "cancelled" } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { status: "pending" },
      _count: true,
      _sum: { total: true },
    }),
    prisma.invoice.findMany({
      where: { status: "credit" },
      select: { total: true, amountPaid: true },
    }),
    prisma.product.count({ where: { isActive: true, stock: { lte: 10 } } }),
    prisma.product.count({ where: { isActive: true } }),
  ]);
  return NextResponse.json({
    today_bills: today._count,
    today_amount: money(today._sum.total || 0),
    pending_deliveries: pending._count,
    pending_amount: money(pending._sum.total || 0),
    credit_count: credit.length,
    credit_outstanding: money(credit.reduce((s, i) => s + Math.max(0, i.total - i.amountPaid), 0)),
    low_stock: lowStock,
    sku_count: skuCount,
  });
}
