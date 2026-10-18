import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { customerKey, money } from "@/lib/money";
export const preferredRegion = ["sin1"];

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const rows = await prisma.invoice.findMany({
    where: { status: "credit" },
    orderBy: { deliveredAt: "desc" },
    take: 200,
  });
  const grouped: Record<string, {
    key: string;
    customer_name: string;
    customer_phone: string;
    customer_shop: string;
    invoice_count: number;
    outstanding: number;
    invoices: object[];
  }> = {};
  for (const inv of rows) {
    const key = customerKey(inv.customerName, inv.customerPhone, inv.customerId);
    if (!grouped[key]) {
      grouped[key] = {
        key,
        customer_name: inv.customerName,
        customer_phone: inv.customerPhone,
        customer_shop: inv.customerShop,
        invoice_count: 0,
        outstanding: 0,
        invoices: [],
      };
    }
    const due = money(Math.max(0, inv.total - inv.amountPaid));
    grouped[key].invoice_count += 1;
    grouped[key].outstanding = money(grouped[key].outstanding + due);
    grouped[key].invoices.push({
      id: inv.id,
      number: inv.number,
      total: money(inv.total),
      amount_paid: money(inv.amountPaid),
      balance: due,
      delivered_at: inv.deliveredAt?.toISOString() || null,
      created_at: inv.createdAt.toISOString(),
    });
  }
  const customers = Object.values(grouped).sort((a, b) => b.outstanding - a.outstanding);
  return NextResponse.json({
    total_outstanding: money(customers.reduce((s, c) => s + c.outstanding, 0)),
    customer_count: customers.length,
    customers,
  });
}
