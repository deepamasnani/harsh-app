import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const preferredRegion = ["sin1"];

export async function GET() {
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true });
}
