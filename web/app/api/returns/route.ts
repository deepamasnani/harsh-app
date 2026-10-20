import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, jsonError } from "@/lib/auth";
import { applyAmountToCredit } from "@/lib/credit";
import { money } from "@/lib/money";

export const preferredRegion = ["sin1"];
export const maxDuration = 30;

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const customerId = Number(body.customer_id);
  if (!customerId) return jsonError("Customer is required");
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return jsonError("Customer not found", 404);

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return jsonError("Select at least one SKU to return");

  const catalog = await prisma.product.findMany({
    where: { id: { in: items.map((row: { product_id: number }) => Number(row.product_id)) } },
  });
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const lines: {
    productId: number;
    sku: string;
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[] = [];

  for (const row of items) {
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return jsonError("Quantity must be more than 0");
    const product = byId.get(Number(row.product_id));
    if (!product) return jsonError(`Unknown product id ${row.product_id}`);
    const unitPrice = Number(row.unit_price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return jsonError(`Enter a valid return rate for ${product.name}`);
    }
    lines.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      quantity,
      unitPrice: money(unitPrice),
      amount: money(unitPrice * quantity),
    });
  }

  const total = money(lines.reduce((s, l) => s + l.amount, 0));
  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const line of lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { increment: line.quantity } },
      });
      rows.push(
        await tx.stockReturn.create({
          data: {
            customerId: customer.id,
            productId: line.productId,
            sku: line.sku,
            name: line.name,
            unit: line.unit,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.amount,
            note: String(body.note || "").trim(),
          },
        })
      );
    }
    if (total > 0) {
      await applyAmountToCredit(tx, customer.id, total, "return", "Return of goods");
    }
    return rows;
  });

  return NextResponse.json({
    ok: true,
    count: created.length,
    amount: total,
  });
}
