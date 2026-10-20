import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { customerKey } from "@/lib/money";

export const preferredRegion = ["sin1"];

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit"));
  const take = limitRaw
    ? Math.min(Math.max(limitRaw, 1), 2000)
    : undefined;
  const rows = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { shop: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { name: "asc" },
    ...(take ? { take } : {}),
    include: {
      _count: { select: { invoices: true } },
      invoices: {
        where: { status: "credit" },
        select: { total: true, amountPaid: true },
      },
    },
  });
  return NextResponse.json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || "",
      shop: c.shop || "",
      invoice_count: c._count.invoices,
      credit_outstanding: c.invoices.reduce((s, inv) => s + Math.max(0, inv.total - inv.amountPaid), 0),
      customer_key: customerKey(c.name, c.phone, c.id),
    }))
  );
}
