import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser, jsonError } from "@/lib/auth";
import { getOrCreateCustomer } from "@/lib/customers";
import { invoiceInclude, invoiceOut, nextNumber } from "@/lib/invoices";
import { money, todayBoundsUtc } from "@/lib/money";
import { archiveInvoice } from "@/lib/archive";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;
  const status = req.nextUrl.searchParams.get("status") || "";
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { customerShop: { contains: q, mode: "insensitive" } },
    ];
  }
  if (user!.role === "staff") {
    const { start, end } = todayBoundsUtc();
    if (status === "cancelled") return NextResponse.json([]);
    where.createdAt = { gte: start, lt: end };
    where.status = status ? status : { not: "cancelled" };
  }
  const rows = await prisma.invoice.findMany({
    where,
    include: invoiceInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows.map((inv) => invoiceOut(inv, false)));
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const customerName = String(body.customer_name || "").trim();
  if (!customerName) return jsonError("Customer name is required");
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return jsonError("Add at least one item");

  const lines: {
    productId: number;
    sku: string;
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];
  let subtotal = 0;
  const stockMoves: { id: number; qty: number }[] = [];
  for (const row of items) {
    const quantity = Number(row.quantity);
    if (quantity <= 0) return jsonError("Quantity must be more than 0");
    const product = await prisma.product.findUnique({ where: { id: Number(row.product_id) } });
    if (!product || !product.isActive) return jsonError(`Unknown product id ${row.product_id}`);
    const lineTotal = money(product.price * quantity);
    subtotal += lineTotal;
    lines.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      quantity,
      unitPrice: product.price,
      lineTotal,
    });
    stockMoves.push({ id: product.id, qty: quantity });
  }

  const cust = await getOrCreateCustomer(customerName, body.customer_phone, body.customer_shop);
  const number = await nextNumber(prisma);
  const inv = await prisma.$transaction(async (tx) => {
    for (const m of stockMoves) {
      await tx.product.update({
        where: { id: m.id },
        data: { stock: { decrement: m.qty } },
      });
    }
    return tx.invoice.create({
      data: {
        number,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        customerShop: cust.shop,
        notes: String(body.notes || "").trim(),
        status: "pending",
        subtotal: money(subtotal),
        total: money(subtotal),
        amountPaid: 0,
        items: { create: lines },
      },
      include: invoiceInclude,
    });
  });
  archiveInvoice(inv.id).catch(() => undefined);
  return NextResponse.json(invoiceOut(inv));
}
