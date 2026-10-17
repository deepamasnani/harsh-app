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
  if (inv.pdfFileId) {
    try {
      const data = await downloadDriveFile(inv.pdfFileId);
      return new NextResponse(new Uint8Array(data), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${inv.number}.pdf"`,
        },
      });
    } catch {
      /* rebuild below */
    }
  }
  const pdf = await buildInvoicePdf(inv);
  archiveInvoice(inv.id).catch(() => undefined);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.number}.pdf"`,
    },
  });
}
