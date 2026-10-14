import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCode, matchesOtp, otpDigest, MockProvider } from "../lib/otp";
test("six-digit OTP is bound to a listing and secret", () => {
  const code = generateCode();
  assert.match(code, /^\d{6}$/);
  const key = "a".repeat(32),
    digest = otpDigest("listing-a", "012345", key);
  assert.equal(matchesOtp(digest, "listing-a", "012345", key), true);
  assert.equal(matchesOtp(digest, "listing-b", "012345", key), false);
  assert.equal(
    matchesOtp(digest, "listing-a", "012345", "b".repeat(32)),
    false,
  );
  assert.equal(matchesOtp(digest, "listing-a", "12345", key), false);
  assert.equal(matchesOtp(digest, "listing-a", "999999", key), false);
});
test("mock supports SMS and voice", async () => {
  const messages: string[] = [];
  const original = console.info;
  console.info = (s: string) => {
    messages.push(s);
  };
  try {
    const p = new MockProvider();
    await p.sendSms("+972500000000", "012345");
    await p.sendVoiceCall("+972500000000", "012345");
    assert.match(messages[0], /SMS.*012345/);
    assert.match(messages[1], /VOICE.*012345/);
  } finally {
    console.info = original;
  }
});
