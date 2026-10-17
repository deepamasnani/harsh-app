import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, jsonError } from "@/lib/auth";
import { invoiceInclude, invoiceOut } from "@/lib/invoices";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id: Number(id) }, include: invoiceInclude });
  if (!inv) return jsonError("Invoice not found", 404);
  if (inv.status !== "pending") return jsonError("Only pending bills can be cancelled");
  const updated = await prisma.$transaction(async (tx) => {
    for (const item of inv.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    return tx.invoice.update({
      where: { id: inv.id },
      data: { status: "cancelled" },
      include: invoiceInclude,
    });
  });
  return NextResponse.json(invoiceOut(updated));
}
