import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createToken, setAuthCookie } from "@/lib/auth";
import { shop } from "@/lib/shop";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ detail: "Wrong username or password" }, { status: 401 });
  }
  const token = await createToken(user);
  const res = NextResponse.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.fullName,
      shop: shop(),
    },
  });
  setAuthCookie(res, token);
  return res;
}
