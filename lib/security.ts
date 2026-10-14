import {
  createHash,
  createHmac,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import { headers, cookies } from "next/headers";
import { db } from "./db";
export function secret(name: string) {
  const value = process.env[name];
  if (!value || value.length < 32 || value.startsWith("replace-"))
    throw new Error(
      `${name} must be configured with at least 32 random characters`,
    );
  return value;
}
export function equal(a: string, b: string) {
  const aa = createHash("sha256").update(a).digest();
  const bb = createHash("sha256").update(b).digest();
  return timingSafeEqual(aa, bb);
}
export const token = () => randomBytes(32).toString("hex");
export async function ipAddress() {
  const h = await headers();
  // An untrusted proxy header must never bypass a rate limit.
  return process.env.TRUST_PROXY === "true"
    ? h.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 80) || "unknown"
    : "local";
}
export async function limit(
  scope: string,
  identity: string,
  max: number,
  seconds: number,
) {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const hash = createHash("sha256").update(identity).digest("hex");
  const key = `${scope}:${window}:${hash}`;
  // Atomic database increment works across processes; no in-memory bypass after restart.
  const bucket = await db.rateBucket.upsert({
    where: { key },
    create: {
      key,
      count: 1,
      expiresAt: new Date((window + 1) * seconds * 1000),
    },
    update: { count: { increment: 1 } },
  });
  if (bucket.count > max)
    throw new Error("בוצעו בקשות רבות מדי. אנא נסו שוב מאוחר יותר.");
}
export async function assertOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const expected = new URL(process.env.APP_URL || "http://localhost:3000")
    .origin;
  if (origin && origin !== expected) throw new Error("בקשה ממקור לא מורשה");
  if (h.get("sec-fetch-site") === "cross-site")
    throw new Error("בקשה ממקור לא מורשה");
}
function sign(value: string) {
  return createHmac("sha256", secret("SESSION_SECRET"))
    .update(value)
    .digest("hex");
}
export async function isAdmin() {
  const value = (await cookies()).get("book_admin")?.value;
  if (!value) return false;
  const [expires, nonce, signature] = value.split(".");
  return (
    Number(expires) > Date.now() &&
    !!nonce &&
    !!signature &&
    equal(signature, sign(`${expires}.${nonce}`))
  );
}
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("נדרשת כניסת מנהל");
}
export async function adminLogin(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (
    !expected ||
    expected.startsWith("replace-") ||
    !equal(password, expected)
  )
    throw new Error("סיסמה שגויה");
  const payload = `${Date.now() + 8 * 3600000}.${token()}`;
  (await cookies()).set("book_admin", `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 3600,
  });
}
export async function adminLogout() {
  (await cookies()).delete("book_admin");
}
