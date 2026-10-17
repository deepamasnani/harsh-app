import { NextResponse } from "next/server";
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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const productId = Number(id);
  const p = await prisma.product.findUnique({ where: { id: productId } });
  if (!p) return NextResponse.json({ detail: "Product not found" }, { status: 404 });
  const body = await req.json();
  const sku = String(body.sku || "").trim().toUpperCase();
  const clash = await prisma.product.findFirst({ where: { sku, id: { not: productId } } });
  if (clash) return NextResponse.json({ detail: "SKU already exists" }, { status: 400 });
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      sku,
      name: String(body.name || "").trim(),
      unit: String(body.unit || "pcs").trim() || "pcs",
      price: Number(body.price) || 0,
      stock: Number(body.stock) || 0,
      category: String(body.category || "General").trim() || "General",
      isActive: true,
    },
  });
  return NextResponse.json(out(updated));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id: Number(id) } });
  if (!p) return NextResponse.json({ detail: "Product not found" }, { status: 404 });
  await prisma.product.update({ where: { id: p.id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
