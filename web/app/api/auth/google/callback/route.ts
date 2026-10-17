import { NextRequest, NextResponse } from "next/server";
import { saveDriveTokens } from "@/lib/drive";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  if (!code) {
    return NextResponse.redirect(`${base}/settings?drive=missing`);
  }
  try {
    await saveDriveTokens(code, base);
    return NextResponse.redirect(`${base}/settings?drive=ok`);
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(`${base}/settings?drive=error`);
  }
}
