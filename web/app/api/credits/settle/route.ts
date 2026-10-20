import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, jsonError } from "@/lib/auth";
import { customerKey, money } from "@/lib/money";
import { archiveInvoice } from "@/lib/archive";

export const preferredRegion = ["sin1"];
export const maxDuration = 60;

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const key = String(body.customer_key || "").trim();
  if (!key) return jsonError("Customer is required");
  const amount = money(body.amount);
  if (amount <= 0) return jsonError("Enter an amount greater than 0");
  const note = String(body.note || "Overall settlement").trim() || "Overall settlement";

  const creditRows = await prisma.invoice.findMany({
    where: { status: "credit" },
    orderBy: { createdAt: "asc" },
    take: 400,
  });
  const bills = creditRows.filter((inv) => customerKey(inv.customerName, inv.customerPhone, inv.customerId) === key);
  if (!bills.length) return jsonError("No open credit for this customer");

  const totalDue = money(bills.reduce((s, inv) => s + Math.max(0, inv.total - inv.amountPaid), 0));
  if (amount > totalDue + 0.001) return jsonError(`Due on this shop is only ${totalDue}`);

  let left = amount;
  const touched: number[] = [];
  await prisma.$transaction(async (tx) => {
    for (const inv of bills) {
      if (left <= 0) break;
      const due = money(Math.max(0, inv.total - inv.amountPaid));
      if (due <= 0) continue;
      const take = money(Math.min(due, left));
      const paid = money(inv.amountPaid + take);
      const settled = paid >= inv.total;
      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          amountPaid: settled ? money(inv.total) : paid,
          status: settled ? "settled" : "credit",
          settledAt: settled ? new Date() : inv.settledAt,
          payments: { create: { amount: take, kind: "settlement", note } },
        },
      });
      touched.push(inv.id);
      left = money(left - take);
    }
  });

  for (const id of touched) archiveInvoice(id).catch(() => undefined);

  const leftoverDue = money(totalDue - amount);
  return NextResponse.json({
    collected: amount,
    bills_updated: touched.length,
    outstanding: leftoverDue,
  });
}
