import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const preferredRegion = ["sin1"];

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  return NextResponse.json(user);
}
