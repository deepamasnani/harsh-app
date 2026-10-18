import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, jsonError } from "@/lib/auth";
import { downloadDriveFile } from "@/lib/drive";
import { archiveInvoice } from "@/lib/archive";
import { invoiceInclude } from "@/lib/invoices";
import { buildInvoicePdf } from "@/lib/pdf";

export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id: Number(id) }, include: invoiceInclude });
  if (!inv) return jsonError("Invoice not found", 404);
  let sig: Buffer | null = null;
  if (inv.signatureFileId) {
    try {
      sig = await downloadDriveFile(inv.signatureFileId);
    } catch {
      sig = null;
    }
  }
  const pdf = await buildInvoicePdf(inv, sig);
  archiveInvoice(inv.id, sig).catch(() => undefined);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.number}.pdf"`,
    },
  });
}
