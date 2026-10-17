import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Invoice, InvoiceItem, Payment } from "@prisma/client";
import { amountInWords, money } from "./money";
import { shop } from "./shop";

function rs(n: number) {
  return "Rs. " + money(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function buildInvoicePdf(
  inv: Invoice & { items: InvoiceItem[]; payments: Payment[] },
  signaturePng?: Buffer | null
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const s = shop();
  let y = 800;
  const ink = rgb(0.11, 0.09, 0.07);

  page.drawText(s.name, { x: 40, y, size: 18, font: bold, color: ink });
  y -= 16;
  if (s.tagline) {
    page.drawText(s.tagline, { x: 40, y, size: 10, font, color: ink });
    y -= 14;
  }
  const addr = [s.address, s.phone].filter(Boolean).join(", ");
  if (addr) {
    page.drawText(addr, { x: 40, y, size: 10, font, color: ink });
    y -= 18;
  }
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.8, color: ink });
  y -= 24;

  page.drawText(`Bill to: ${inv.customerName}`, { x: 40, y, size: 11, font, color: ink });
  page.drawText(`Invoice ${inv.number}`, { x: 360, y, size: 11, font, color: ink });
  y -= 16;
  if (inv.customerPhone) page.drawText(inv.customerPhone, { x: 40, y, size: 11, font, color: ink });
  page.drawText(
    inv.createdAt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    { x: 360, y, size: 11, font, color: ink }
  );
  y -= 16;
  if (inv.customerShop && inv.customerShop !== inv.customerName) {
    page.drawText(inv.customerShop, { x: 40, y, size: 11, font, color: ink });
    y -= 16;
  }
  page.drawText(`Status: ${inv.status}`, { x: 40, y, size: 11, font, color: ink });
  y -= 22;

  page.drawText("Item", { x: 48, y, size: 10, font: bold, color: ink });
  page.drawText("Qty", { x: 280, y, size: 10, font: bold, color: ink });
  page.drawText("Rate", { x: 370, y, size: 10, font: bold, color: ink });
  page.drawText("Amount", { x: 490, y, size: 10, font: bold, color: ink });
  y -= 16;
  for (const it of inv.items) {
    page.drawText((it.name || "").slice(0, 42), { x: 48, y, size: 10, font, color: ink });
    page.drawText(`${it.quantity} ${it.unit}`.trim(), { x: 270, y, size: 10, font, color: ink });
    page.drawText(rs(it.unitPrice), { x: 350, y, size: 10, font, color: ink });
    page.drawText(rs(it.lineTotal), { x: 470, y, size: 10, font, color: ink });
    y -= 16;
  }
  y -= 8;
  page.drawText(`Total  ${rs(inv.total)}`, { x: 360, y, size: 12, font: bold, color: ink });
  y -= 16;
  if (inv.amountPaid) {
    page.drawText(`Received  ${rs(inv.amountPaid)}`, { x: 360, y, size: 10, font, color: ink });
    y -= 14;
  }
  const due = money(Math.max(0, inv.total - inv.amountPaid));
  if (due && inv.status === "credit") {
    page.drawText(`Balance due  ${rs(due)}`, { x: 360, y, size: 10, font, color: ink });
    y -= 14;
  }
  page.drawText(amountInWords(inv.total), { x: 40, y, size: 9, font: italic, color: ink });
  y -= 24;

  if (signaturePng && signaturePng.length > 80) {
    try {
      const img = await pdf.embedPng(signaturePng);
      const w = 180;
      const h = (img.height / img.width) * w;
      page.drawText("Customer signature (credit)", { x: 40, y, size: 9, font, color: ink });
      y -= 8 + h;
      page.drawImage(img, { x: 40, y, width: w, height: h });
    } catch {
      page.drawText("Customer signature (credit) — image could not be embedded", { x: 40, y, size: 9, font, color: ink });
    }
  }

  return Buffer.from(await pdf.save());
}
