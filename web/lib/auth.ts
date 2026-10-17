import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import { shop } from "./shop";

const COOKIE = "hh_token";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "harsh-hardware-change-me-in-production");
}

export type AuthUser = {
  id: number;
  username: string;
  role: string;
  full_name: string;
  shop: ReturnType<typeof shop>;
};

export async function createToken(user: { id: number; role: string }) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setExpirationTime("7d")
    .sign(secret());
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.fullName,
      shop: shop(),
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null as AuthUser | null, error: NextResponse.json({ detail: "Not signed in" }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function requireAdmin() {
  const { user, error } = await requireUser();
  if (error) return { user, error };
  if (user!.role !== "admin") {
    return { user, error: NextResponse.json({ detail: "Admin only" }, { status: 403 }) };
  }
  return { user, error: null };
}

export function jsonError(detail: string, status = 400) {
  return NextResponse.json({ detail }, { status });
}
