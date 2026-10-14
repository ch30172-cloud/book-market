import { createHmac, randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { equal, limit, secret } from "./security";
import { expiryDate, publicationStatus } from "./lifecycle";
export interface OtpProvider {
  sendSms(phone: string, code: string): Promise<void>;
  sendVoiceCall(phone: string, code: string): Promise<void>;
}
export class MockProvider implements OtpProvider {
  async sendSms(phone: string, code: string) {
    console.info(`[MOCK OTP SMS] ${phone}: ${code}`);
  }
  async sendVoiceCall(phone: string, code: string) {
    console.info(`[MOCK OTP VOICE] ${phone}: ${code}`);
  }
}
export class IsraeliProvider implements OtpProvider {
  async sendSms(_phone: string, _code: string): Promise<void> {
    throw new Error("ספק המסרונים טרם הוגדר");
  }
  async sendVoiceCall(_phone: string, _code: string): Promise<void> {
    throw new Error("ספק השיחות טרם הוגדר");
  }
  // Implement your chosen provider here using ISRAEL_SMS_API_URL / ISRAEL_SMS_API_KEY.
  // Never log real codes or include credentials in browser responses.
}
export function provider(): OtpProvider {
  if ((process.env.OTP_PROVIDER || "mock") === "mock") {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_MOCK_OTP !== "true"
    )
      throw new Error("אימות טלפוני אינו זמין כרגע");
    return new MockProvider();
  }
  return new IsraeliProvider();
}
export const generateCode = () =>
  randomInt(0, 1_000_000).toString().padStart(6, "0");
export function otpDigest(
  listingId: string,
  code: string,
  key = secret("OTP_SECRET"),
) {
  return createHmac("sha256", key).update(`${listingId}:${code}`).digest("hex");
}
export function matchesOtp(
  stored: string,
  listingId: string,
  code: string,
  key = secret("OTP_SECRET"),
) {
  return /^\d{6}$/.test(code) && equal(stored, otpDigest(listingId, code, key));
}
export async function issueOtp(
  listingId: string,
  ip: string,
  channel: string,
  transport = provider(),
) {
  const listing = await db.listing.findUniqueOrThrow({
    where: { id: listingId },
  });
  if (listing.verifiedAt || listing.status === "REMOVED")
    throw new Error("המודעה כבר אומתה או הוסרה");
  if (await db.blockedPhone.findUnique({ where: { phone: listing.phone } }))
    throw new Error("לא ניתן לפרסם ממספר זה");
  await limit("otp-phone", listing.phone, 3, 3600);
  await limit("otp-ip", ip, 10, 3600);
  const code = generateCode();
  const challenge = await db.otpChallenge.upsert({
    where: { listingId },
    create: {
      listingId,
      digest: otpDigest(listingId, code),
      expiresAt: new Date(Date.now() + 10 * 60000),
    },
    update: {
      digest: otpDigest(listingId, code),
      expiresAt: new Date(Date.now() + 10 * 60000),
      attempts: 0,
      consumed: false,
    },
  });
  try {
    if (channel === "voice") await transport.sendVoiceCall(listing.phone, code);
    else await transport.sendSms(listing.phone, code);
  } catch (error) {
    await db.otpChallenge.updateMany({
      where: { id: challenge.id, digest: challenge.digest },
      data: { consumed: true },
    });
    throw error;
  }
}
// Serializable verification keeps one-use codes and the 10-listing limit atomic.
export async function verifyOtp(listingId: string, code: string) {
  for (let retry = 0; retry < 3; retry++) {
    try {
      const outcome = await db.$transaction(
        async (tx) => {
          const listing = await tx.listing.findUniqueOrThrow({
            where: { id: listingId },
            include: { otp: true },
          });
          const challenge = listing.otp;
          if (
            !challenge ||
            challenge.consumed ||
            challenge.attempts >= 5 ||
            challenge.expiresAt <= new Date() ||
            listing.status === "REMOVED"
          )
            return "הקוד פג תוקף. בקשו קוד חדש";
          const claim = await tx.otpChallenge.updateMany({
            where: {
              id: challenge.id,
              consumed: false,
              attempts: challenge.attempts,
              digest: challenge.digest,
            },
            data: { attempts: { increment: 1 } },
          });
          if (!claim.count) return "נסו שוב";
          if (!matchesOtp(challenge.digest, listingId, code))
            return "הקוד שגוי";
          if (
            await tx.blockedPhone.findUnique({
              where: { phone: listing.phone },
            })
          )
            return "לא ניתן לפרסם ממספר זה";
          const count = await tx.listing.count({
            where: {
              phone: listing.phone,
              verifiedAt: { not: null },
              status: { in: ["ACTIVE", "PENDING"] },
              expiresAt: { gt: new Date() },
            },
          });
          if (count >= 10) return "ניתן לפרסם עד 10 מודעות פעילות למספר טלפון";
          await tx.otpChallenge.update({
            where: { id: challenge.id },
            data: { consumed: true },
          });
          await tx.listing.update({
            where: { id: listingId },
            data: {
              verifiedAt: new Date(),
              status: publicationStatus(listing.suspicious),
              expiresAt: expiryDate(),
            },
          });
          return null;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (outcome) throw new Error(outcome);
      return;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        retry < 2
      )
        continue;
      throw error;
    }
  }
}
