import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { driveAuthUrl, driveStatus, disconnectDrive } from "@/lib/drive";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const status = await driveStatus();
  return NextResponse.json({
    ...status,
    configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { detail: "Google Drive is not configured. Add a Google OAuth Web client, then reconnect." },
      { status: 503 }
    );
  }
  const origin = new URL(req.url).origin;
  return NextResponse.json({ url: driveAuthUrl(origin) });
}

export async function DELETE() {
  const { error } = await requireAdmin();
  if (error) return error;
  await disconnectDrive();
  return NextResponse.json({ ok: true });
}
