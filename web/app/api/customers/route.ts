import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { customerKey } from "@/lib/money";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
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
    take: 40,
  });
  return NextResponse.json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || "",
      shop: c.shop || "",
      customer_key: customerKey(c.name, c.phone, c.id),
    }))
  );
}
