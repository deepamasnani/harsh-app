import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { driveAuthUrl, driveStatus, disconnectDrive } from "@/lib/drive";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const status = await driveStatus();
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ detail: "GOOGLE_CLIENT_ID is not set" }, { status: 503 });
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return NextResponse.json({ url: driveAuthUrl(origin) });
}

export async function DELETE() {
  const { error } = await requireAdmin();
  if (error) return error;
  await disconnectDrive();
  return NextResponse.json({ ok: true });
}
