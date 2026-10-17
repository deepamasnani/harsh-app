import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { money, todayBoundsUtc } from "@/lib/money";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const { start } = todayBoundsUtc();
  const invoices = await prisma.invoice.findMany();
  const today = invoices.filter((i) => i.createdAt >= start);
  const credit = invoices.filter((i) => i.status === "credit");
  const [lowStock, skuCount] = await Promise.all([
    prisma.product.count({ where: { isActive: true, stock: { lte: 10 } } }),
    prisma.product.count({ where: { isActive: true } }),
  ]);
  return NextResponse.json({
    today_bills: today.filter((i) => i.status !== "cancelled").length,
    today_amount: money(today.filter((i) => i.status !== "cancelled").reduce((s, i) => s + i.total, 0)),
    pending_deliveries: invoices.filter((i) => i.status === "pending").length,
    pending_amount: money(invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.total, 0)),
    credit_count: credit.length,
    credit_outstanding: money(credit.reduce((s, i) => s + Math.max(0, i.total - i.amountPaid), 0)),
    low_stock: lowStock,
    sku_count: skuCount,
  });
}
