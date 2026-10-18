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
  const take = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : q ? 12 : 40, 80);
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
    orderBy: q ? { name: "asc" } : { id: "desc" },
    take,
    include: { _count: { select: { invoices: true } } },
  });
  return NextResponse.json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || "",
      shop: c.shop || "",
      invoice_count: c._count.invoices,
      customer_key: customerKey(c.name, c.phone, c.id),
    }))
  );
}
