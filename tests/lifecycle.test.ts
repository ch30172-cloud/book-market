import { test } from "node:test";
import assert from "node:assert/strict";
import { expiryDate, isExpired, publicationStatus } from "../lib/lifecycle";
test("expiry is exactly 30 days and expires at the boundary", () => {
  const start = new Date("2026-10-01T12:00:00Z"),
    expiry = expiryDate(start);
  assert.equal(expiry.toISOString(), "2026-10-31T12:00:00.000Z");
  assert.equal(isExpired(expiry, new Date(expiry.getTime() - 1)), false);
  assert.equal(isExpired(expiry, expiry), true);
});
test("moderation and approval mode cannot auto-publish suspicious listings", () => {
  assert.equal(publicationStatus(false, false), "ACTIVE");
  assert.equal(publicationStatus(true, false), "PENDING");
  assert.equal(publicationStatus(false, true), "PENDING");
});
