import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, jsonError } from "@/lib/auth";
import { invoiceInclude, invoiceOut } from "@/lib/invoices";
import { money } from "@/lib/money";
import { archiveInvoice } from "@/lib/archive";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id: Number(id) }, include: invoiceInclude });
  if (!inv) return jsonError("Invoice not found", 404);
  if (inv.status !== "credit") return jsonError("Only credit invoices can be settled");
  const body = await req.json().catch(() => ({}));
  const remaining = money(Math.max(0, inv.total - inv.amountPaid));
  const amount = body.amount != null ? money(body.amount) : remaining;
  if (amount <= 0) return jsonError("Enter an amount greater than 0");
  if (amount > remaining + 0.001) return jsonError("Amount is more than what is due");
  const paid = money(inv.amountPaid + amount);
  const settled = paid >= inv.total;
  const updated = await prisma.invoice.update({
    where: { id: inv.id },
    data: {
      amountPaid: settled ? money(inv.total) : paid,
      status: settled ? "settled" : "credit",
      settledAt: settled ? new Date() : inv.settledAt,
      payments: { create: { amount, kind: "settlement", note: String(body.note || "") } },
    },
    include: invoiceInclude,
  });
  archiveInvoice(updated.id).catch(() => undefined);
  return NextResponse.json(invoiceOut(updated));
}
