import { prisma } from "./db";
import { invoiceInclude } from "./invoices";
import { buildInvoicePdf } from "./pdf";
import { downloadDriveFile, driveStatus, uploadInvoiceDump } from "./drive";

const inflight = new Map<number, Promise<void>>();

export async function archiveInvoice(invoiceId: number, signaturePng?: Buffer | null) {
  const pending = inflight.get(invoiceId);
  if (pending) await pending;
  const job = dumpInvoice(invoiceId, signaturePng).finally(() => inflight.delete(invoiceId));
  inflight.set(invoiceId, job);
  return job;
}

async function dumpInvoice(invoiceId: number, signaturePng?: Buffer | null) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: invoiceInclude,
  });
  if (!inv) return;
  let sig = signaturePng || null;
  if (!sig && inv.signatureFileId) {
    try {
      sig = await downloadDriveFile(inv.signatureFileId);
    } catch {
      sig = null;
    }
  }
  const pdf = await buildInvoicePdf(inv, sig);
  const status = await driveStatus();
  if (!status.connected) return;
  try {
    const ids = await uploadInvoiceDump({
      customerName: inv.customerName,
      createdAt: inv.createdAt,
      number: inv.number,
      pdf,
      signaturePng: sig,
    });
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        pdfFileId: ids.pdfId,
        signatureFileId: ids.signatureFileId || inv.signatureFileId,
      },
    });
  } catch (err) {
    console.error("Drive dump failed", err);
  }
}

export function pngFromDataUrl(dataUrl: string) {
  const raw = dataUrl.split(",", 2).pop() || "";
  return Buffer.from(raw, "base64");
}
