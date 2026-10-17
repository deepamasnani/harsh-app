import { Invoice, InvoiceItem, Payment } from "@prisma/client";
import { amountInWords, customerKey, money } from "./money";
import { shop } from "./shop";

type Inv = Invoice & { items: InvoiceItem[]; payments: Payment[] };

export function invoiceOut(inv: Inv, withItems = true) {
  const paid = money(inv.amountPaid);
  const total = money(inv.total);
  const balance = money(Math.max(0, total - paid));
  const data: Record<string, unknown> = {
    id: inv.id,
    number: inv.number,
    customer_id: inv.customerId,
    customer_name: inv.customerName,
    customer_phone: inv.customerPhone,
    customer_shop: inv.customerShop,
    customer_key: customerKey(inv.customerName, inv.customerPhone, inv.customerId),
    notes: inv.notes,
    status: inv.status,
    subtotal: inv.subtotal,
    total,
    amount_paid: paid,
    balance,
    amount_words: amountInWords(total),
    signature_url: inv.signaturePath || inv.signatureFileId ? `/api/files/signature/${inv.id}` : null,
    pdf_url: `/api/files/invoice/${inv.id}`,
    created_at: inv.createdAt.toISOString(),
    delivered_at: inv.deliveredAt ? inv.deliveredAt.toISOString() : null,
    settled_at: inv.settledAt ? inv.settledAt.toISOString() : null,
    item_count: inv.items.length,
    shop: shop(),
    payments: inv.payments.map((p) => ({
      id: p.id,
      amount: money(p.amount),
      kind: p.kind,
      note: p.note,
      created_at: p.createdAt.toISOString(),
    })),
  };
  if (withItems) {
    data.items = inv.items.map((it) => ({
      id: it.id,
      sku: it.sku,
      name: it.name,
      unit: it.unit,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      line_total: it.lineTotal,
    }));
  }
  return data;
}

export async function nextNumber(prisma: { invoice: { findFirst: Function } }) {
  const last = await prisma.invoice.findFirst({ orderBy: { id: "desc" } });
  const n = last ? last.id + 1 : 1;
  return `HH-${String(n).padStart(5, "0")}`;
}

export const invoiceInclude = {
  items: true,
  payments: { orderBy: { createdAt: "asc" as const } },
};
