import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, jsonError } from "@/lib/auth";
import { invoiceInclude, invoiceOut } from "@/lib/invoices";
import { staffCanSeeInvoice } from "@/lib/money";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id: Number(id) }, include: invoiceInclude });
  if (!inv) return jsonError("Invoice not found", 404);
  if (user!.role === "staff" && !staffCanSeeInvoice(inv)) {
    return jsonError("Invoice not found", 404);
  }
  return NextResponse.json(invoiceOut(inv));
}
