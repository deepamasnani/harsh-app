import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const ITERATIONS = 120_000;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const dk = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256").toString("hex");
  return `pbkdf2$${salt}$${dk}`;
}

export function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const [, salt, dk] = parts;
  const check = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256").toString("hex");
  try {
    return timingSafeEqual(Buffer.from(check, "hex"), Buffer.from(dk, "hex"));
  } catch {
    return false;
  }
}

function keyBuf() {
  const raw = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "harsh-hardware-dev-key-32chars!!";
  return pbkdf2Sync(raw, "hh-drive", 10000, 32, "sha256");
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuf(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decrypt(payload: string) {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const decipher = createDecipheriv("aes-256-gcm", keyBuf(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
