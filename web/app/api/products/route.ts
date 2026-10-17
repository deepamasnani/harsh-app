import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function out(p: {
  id: number;
  sku: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  category: string;
  isActive: boolean;
}) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    price: p.price,
    stock: p.stock,
    category: p.category,
    is_active: p.isActive,
  };
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const includeInactive = req.nextUrl.searchParams.get("include_inactive") === "true";
  const rows = await prisma.product.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(q
        ? {
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rows.map(out));
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const sku = String(body.sku || "").trim().toUpperCase();
  if (await prisma.product.findUnique({ where: { sku } })) {
    return NextResponse.json({ detail: "SKU already exists" }, { status: 400 });
  }
  const p = await prisma.product.create({
    data: {
      sku,
      name: String(body.name || "").trim(),
      unit: String(body.unit || "pcs").trim() || "pcs",
      price: Number(body.price) || 0,
      stock: Number(body.stock) || 0,
      category: String(body.category || "General").trim() || "General",
    },
  });
  return NextResponse.json(out(p));
}
