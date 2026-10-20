import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, jsonError } from "@/lib/auth";
import { customerKey, money } from "@/lib/money";
import { invoiceOut } from "@/lib/invoices";

export const preferredRegion = ["sin1"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const customerId = Number(id);
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return jsonError("Customer not found", 404);

  const [invoices, returns] = await Promise.all([
    prisma.invoice.findMany({
      where: { customerId: customer.id },
      include: {
        items: { select: { id: true } },
        payments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    prisma.stockReturn.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const credit_outstanding = money(
    invoices
      .filter((inv) => inv.status === "credit")
      .reduce((s, inv) => s + Math.max(0, inv.total - inv.amountPaid), 0)
  );

  return NextResponse.json({
    id: customer.id,
    name: customer.name,
    phone: customer.phone || "",
    shop: customer.shop || "",
    customer_key: customerKey(customer.name, customer.phone, customer.id),
    invoice_count: invoices.length,
    credit_outstanding,
    invoices: invoices.map((inv) => invoiceOut(inv as any, false)),
    returns: returns.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      unit: r.unit,
      quantity: r.quantity,
      unit_price: r.unitPrice,
      amount: money(r.amount),
      created_at: r.createdAt.toISOString(),
    })),
  });
}
