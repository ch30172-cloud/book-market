import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../lib/db";
import { issueOtp, verifyOtp, OtpProvider } from "../../lib/otp";
import { expiryDate } from "../../lib/lifecycle";
import { expireListings } from "../../scripts/expire";
import { limit, token } from "../../lib/security";
test("database OTP flow, blocking, caps, moderation, expiry and throttling", async () => {
  let code = "";
  const transport: OtpProvider = {
    async sendSms(_phone, c) {
      code = c;
    },
    async sendVoiceCall(_phone, c) {
      code = c;
    },
  };
  const create = (phone = "+972501234567", suspicious = false) =>
    db.listing.create({
      data: {
        title: "ספר בדיקה",
        category: "READING",
        condition: "GOOD",
        city: "בני ברק",
        phone,
        suspicious,
        manageToken: token(),
        expiresAt: expiryDate(),
      },
    });
  try {
    const first = await create();
    await issueOtp(first.id, "ip-a", "sms", transport);
    assert.match(code, /^\d{6}$/);
    const valid = code;
    await assert.rejects(
      () => verifyOtp(first.id, valid === "000000" ? "111111" : "000000"),
      /שגוי/,
    );
    assert.equal(
      (await db.listing.findUniqueOrThrow({ where: { id: first.id } }))
        .verifiedAt,
      null,
    );
    await verifyOtp(first.id, valid);
    assert.equal(
      (await db.listing.findUniqueOrThrow({ where: { id: first.id } })).status,
      "ACTIVE",
    );
    await assert.rejects(() => verifyOtp(first.id, valid), /פג תוקף/);
    const suspect = await create("+972501111111", true);
    await issueOtp(suspect.id, "ip-b", "voice", transport);
    await verifyOtp(suspect.id, code);
    assert.equal(
      (await db.listing.findUniqueOrThrow({ where: { id: suspect.id } }))
        .status,
      "PENDING",
    );
    const locked = await create("+972502222222");
    await issueOtp(locked.id, "ip-c", "sms", transport);
    const wrong = code === "999999" ? "000000" : "999999";
    for (let i = 0; i < 5; i++)
      await assert.rejects(() => verifyOtp(locked.id, wrong), /שגוי/);
    await assert.rejects(() => verifyOtp(locked.id, code), /פג תוקף/);
    const blocked = await create("+972503333333");
    await issueOtp(blocked.id, "ip-d", "sms", transport);
    await db.blockedPhone.create({
      data: { phone: blocked.phone, reason: "test" },
    });
    await assert.rejects(() => verifyOtp(blocked.id, code), /לא ניתן/);
    await assert.rejects(
      () => issueOtp(blocked.id, "ip-d", "sms", transport),
      /לא ניתן/,
    );
    const timed = await create("+972504444444");
    await issueOtp(timed.id, "ip-e", "sms", transport);
    await db.otpChallenge.update({
      where: { listingId: timed.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await assert.rejects(() => verifyOtp(timed.id, code), /פג תוקף/);
    const capped = await create("+972505555555");
    await issueOtp(capped.id, "ip-f", "sms", transport);
    for (let i = 0; i < 10; i++) {
      const l = await create(capped.phone);
      await db.listing.update({
        where: { id: l.id },
        data: { status: "ACTIVE", verifiedAt: new Date() },
      });
    }
    await assert.rejects(() => verifyOtp(capped.id, code), /10/);
    await limit("test", "one", 2, 3600);
    await limit("test", "one", 2, 3600);
    await assert.rejects(() => limit("test", "one", 2, 3600), /רבות/);
    await db.listing.update({
      where: { id: first.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const sold = await create("+972506666666");
    await db.listing.update({
      where: { id: sold.id },
      data: { status: "SOLD", expiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal(await expireListings(), 1);
    assert.equal(
      (await db.listing.findUniqueOrThrow({ where: { id: first.id } })).status,
      "EXPIRED",
    );
    assert.equal(
      (await db.listing.findUniqueOrThrow({ where: { id: sold.id } })).status,
      "SOLD",
    );
    assert.equal(await expireListings(), 0);
  } finally {
    await db.$disconnect();
  }
});
