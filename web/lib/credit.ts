import { Prisma } from "@prisma/client";
import { money } from "./money";

export async function applyAmountToCredit(
  tx: Prisma.TransactionClient,
  customerId: number,
  amount: number,
  kind: string,
  note: string
) {
  let left = money(amount);
  if (left <= 0) return 0;
  const bills = await tx.invoice.findMany({
    where: { status: "credit", customerId },
    orderBy: { createdAt: "asc" },
  });
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
        payments: { create: { amount: take, kind, note } },
      },
    });
    left = money(left - take);
  }
  return money(amount - left);
}
