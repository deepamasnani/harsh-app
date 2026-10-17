import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, jsonError } from "@/lib/auth";
import { downloadDriveFile } from "@/lib/drive";

export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id: Number(id) } });
  if (!inv || (!inv.signaturePath && !inv.signatureFileId)) {
    return jsonError("Signature not found", 404);
  }
  if (!inv.signatureFileId) return jsonError("Signature not found", 404);
  try {
    const data = await downloadDriveFile(inv.signatureFileId);
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": "image/png" } });
  } catch {
    return jsonError("Signature not found", 404);
  }
}
