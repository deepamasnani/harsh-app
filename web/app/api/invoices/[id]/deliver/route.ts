import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, jsonError } from "@/lib/auth";
import { invoiceInclude, invoiceOut } from "@/lib/invoices";
import { isToday, money } from "@/lib/money";
import { archiveInvoice, pngFromDataUrl } from "@/lib/archive";
import { driveStatus, uploadInvoiceDump } from "@/lib/drive";
import { buildInvoicePdf } from "@/lib/pdf";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id: Number(id) }, include: invoiceInclude });
  if (!inv) return jsonError("Invoice not found", 404);
  if (inv.status !== "pending") return jsonError("This receipt is already closed");
  if (user!.role === "staff" && !isToday(inv.createdAt)) return jsonError("Invoice not found", 404);
  const body = await req.json();
  if (!["paid", "credit"].includes(body.payment)) return jsonError("payment must be paid or credit");
  const cash = money(body.amount_paid);
  if (cash < 0) return jsonError("Part payment cannot be negative");
  if (cash > inv.total) return jsonError("Part payment cannot exceed the bill");

  let signaturePath: string | null = inv.signaturePath;
  let signaturePng: Buffer | null = null;
  let signatureFileId: string | null = inv.signatureFileId;

  if (body.payment === "paid" || cash >= inv.total) {
    const updated = await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: "paid",
        amountPaid: money(inv.total),
        deliveredAt: new Date(),
        payments: {
          create: { amount: money(inv.total), kind: "delivery", note: "Collected in full" },
        },
      },
      include: invoiceInclude,
    });
    archiveInvoice(updated.id).catch(() => undefined);
    return NextResponse.json(invoiceOut(updated));
  }

  if (!body.signature) return jsonError("Customer signature is required for the remaining credit");
  try {
    signaturePng = pngFromDataUrl(String(body.signature));
  } catch {
    return jsonError("Invalid signature image");
  }
  if (!signaturePng || signaturePng.length < 80) return jsonError("Signature is empty");
  signaturePath = `${inv.number}.png`;

  const drive = await driveStatus();
  if (drive.connected) {
    try {
      const pdf = await buildInvoicePdf(
        { ...inv, status: "credit", amountPaid: cash, deliveredAt: new Date() },
        signaturePng
      );
      const ids = await uploadInvoiceDump({
        customerName: inv.customerName,
        createdAt: inv.createdAt,
        number: inv.number,
        pdf,
        signaturePng,
      });
      signatureFileId = ids.signatureFileId;
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { pdfFileId: ids.pdfId, signatureFileId },
      });
    } catch (err) {
      console.error(err);
    }
  }

  const updated = await prisma.invoice.update({
    where: { id: inv.id },
    data: {
      status: "credit",
      amountPaid: cash,
      signaturePath,
      signatureFileId,
      deliveredAt: new Date(),
      payments: cash > 0 ? { create: { amount: cash, kind: "delivery", note: "Part payment on delivery" } } : undefined,
    },
    include: invoiceInclude,
  });
  if (!drive.connected) archiveInvoice(updated.id, signaturePng).catch(() => undefined);
  return NextResponse.json(invoiceOut(updated));
}
