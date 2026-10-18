import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { Invoice, InvoiceItem, Payment } from "@prisma/client";
import { amountInWords, money } from "./money";
import { shop } from "./shop";

const PAGE = { w: 595, h: 842 };
const M = 44;
const RIGHT = PAGE.w - M;
const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.12, 0.14, 0.18);
const RULE = rgb(0.86, 0.87, 0.89);
const DUE = rgb(0.61, 0.27, 0.09);
const PAPER = rgb(0.97, 0.97, 0.96);

function rs(n: number) {
  return (
    "Rs. " +
    money(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function whenIst(dt: Date) {
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function statusLabel(status: string) {
  if (status === "pending") return "With Staff";
  if (status === "paid") return "Paid";
  if (status === "credit") return "Credit";
  if (status === "settled") return "Settled";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function drawRight(
  page: PDFPage,
  text: string,
  xRight: number,
  y: number,
  size: number,
  font: PDFFont,
  color = INK
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: xRight - w, y, size, font, color });
}

function clip(font: PDFFont, text: string, size: number, max: number) {
  let t = (text || "").trim();
  if (font.widthOfTextAtSize(t, size) <= max) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > max) t = t.slice(0, -1);
  return `${t}...`;
}

export async function buildInvoicePdf(
  inv: Invoice & { items: InvoiceItem[]; payments: Payment[] },
  signaturePng?: Buffer | null
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE.w, PAGE.h]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const s = shop();
  const due = money(Math.max(0, inv.total - inv.amountPaid));
  let y = PAGE.h - 48;

  page.drawText(s.name || "BB Traders", { x: M, y, size: 22, font: bold, color: INK });
  drawRight(page, "INVOICE", RIGHT, y + 8, 9, font, MUTED);
  y -= 16;
  drawRight(page, inv.number, RIGHT, y, 13, bold, INK);
  y -= 14;
  if (s.tagline) {
    page.drawText(s.tagline.toUpperCase(), { x: M, y, size: 8, font, color: MUTED });
  }
  drawRight(page, whenIst(inv.createdAt), RIGHT, y, 10, font, MUTED);
  y -= 13;
  page.drawText(s.address || "", { x: M, y, size: 10, font, color: INK });
  drawRight(page, statusLabel(inv.status), RIGHT, y, 11, bold, INK);
  y -= 13;
  if (s.phone) page.drawText(s.phone, { x: M, y, size: 10, font, color: INK });
  if (s.gstin) {
    y -= 12;
    page.drawText(`GSTIN ${s.gstin}`, { x: M, y, size: 9, font, color: MUTED });
  }

  y -= 14;
  page.drawLine({ start: { x: M, y }, end: { x: RIGHT, y }, thickness: 1.6, color: LINE });
  y -= 22;

  page.drawText("BILL TO", { x: M, y, size: 8, font, color: MUTED });
  y -= 16;
  page.drawText(clip(bold, inv.customerName, 14, 300), { x: M, y, size: 14, font: bold, color: INK });
  y -= 14;
  if (inv.customerShop && inv.customerShop !== inv.customerName) {
    page.drawText(clip(font, inv.customerShop, 10, 300), { x: M, y, size: 10, font, color: INK });
    y -= 13;
  }
  if (inv.customerPhone) {
    page.drawText(inv.customerPhone, { x: M, y, size: 10, font, color: INK });
    y -= 13;
  }
  if (inv.notes) {
    y -= 4;
    page.drawText("NOTES", { x: M, y, size: 8, font, color: MUTED });
    y -= 13;
    page.drawText(clip(font, inv.notes, 10, 500), { x: M, y, size: 10, font, color: INK });
    y -= 13;
  }

  y -= 10;
  page.drawLine({ start: { x: M, y }, end: { x: RIGHT, y }, thickness: 1, color: LINE });
  y -= 16;
  page.drawText("Item", { x: M, y, size: 10, font: bold, color: INK });
  drawRight(page, "Qty", 318, y, 10, bold);
  drawRight(page, "Rate", 430, y, 10, bold);
  drawRight(page, "Amount", RIGHT, y, 10, bold);
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: RIGHT, y }, thickness: 1, color: LINE });
  y -= 18;

  for (const it of inv.items) {
    if (y < 170) break;
    page.drawText(clip(bold, it.name, 11, 230), { x: M, y, size: 11, font: bold, color: INK });
    drawRight(page, `${it.quantity} ${it.unit}`.trim(), 318, y, 10, font);
    drawRight(page, rs(it.unitPrice), 430, y, 10, font);
    drawRight(page, rs(it.lineTotal), RIGHT, y, 10, font);
    y -= 13;
    if (it.sku) {
      page.drawText(clip(font, it.sku, 8, 230), { x: M, y, size: 8, font, color: MUTED });
      y -= 12;
    }
    y -= 6;
    page.drawLine({ start: { x: M, y: y + 8 }, end: { x: RIGHT, y: y + 8 }, thickness: 0.4, color: RULE });
  }

  y -= 8;
  drawRight(page, "Total", 430, y, 11, font);
  drawRight(page, rs(inv.total), RIGHT, y, 14, bold);
  y -= 16;
  if (inv.amountPaid > 0) {
    drawRight(page, "Received", 430, y, 10, font, MUTED);
    drawRight(page, rs(inv.amountPaid), RIGHT, y, 10, font, MUTED);
    y -= 14;
  }
  if (due > 0 && inv.status === "credit") {
    drawRight(page, "Balance due", 430, y, 11, bold, DUE);
    drawRight(page, rs(due), RIGHT, y, 11, bold, DUE);
    y -= 16;
  }
  page.drawText(amountInWords(inv.total), { x: M, y, size: 9, font: italic, color: MUTED });
  y -= 28;

  page.drawLine({ start: { x: M, y }, end: { x: 240, y }, thickness: 0.6, color: RULE });
  y -= 14;
  page.drawText("CUSTOMER SIGNATURE (CREDIT)", { x: M, y, size: 8, font, color: MUTED });
  y -= 8;

  const boxW = 200;
  const boxH = 72;
  y -= boxH;
  page.drawRectangle({ x: M, y, width: boxW, height: boxH, color: PAPER });
  if (signaturePng && signaturePng.length > 80) {
    try {
      const img = await pdf.embedPng(signaturePng);
      const maxW = boxW - 12;
      const maxH = boxH - 12;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, { x: M + 6, y: y + (boxH - h) / 2, width: w, height: h });
    } catch {
      page.drawText("Signature could not be printed", { x: M + 8, y: y + 30, size: 9, font, color: MUTED });
    }
  } else if (inv.status === "credit") {
    page.drawText("No signature", { x: M + 8, y: y + 30, size: 9, font, color: MUTED });
  }

  let fy = y + boxH - 4;
  const payX = 320;
  for (const p of inv.payments) {
    const kind = p.kind === "delivery" ? "On delivery" : "Part payment";
    page.drawText(`${kind}  ${rs(p.amount)}`, { x: payX, y: fy, size: 9, font, color: MUTED });
    fy -= 12;
  }
  if (inv.deliveredAt) {
    page.drawText(`Delivered ${whenIst(inv.deliveredAt)}`, { x: payX, y: fy, size: 9, font, color: MUTED });
    fy -= 12;
  }
  if (inv.settledAt) {
    page.drawText(`Settled ${whenIst(inv.settledAt)}`, { x: payX, y: fy, size: 9, font, color: MUTED });
  }

  page.drawText("Goods once sold are subject to shop terms.", {
    x: M,
    y: 36,
    size: 9,
    font,
    color: MUTED,
  });

  return Buffer.from(await pdf.save());
}
