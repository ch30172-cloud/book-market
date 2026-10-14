import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../lib/phone";
test("normalizes Israeli mobile and kosher landline variants", () => {
  for (const input of [
    "050-1234567",
    "+972 50 123 4567",
    "00972501234567",
    "972501234567",
  ])
    assert.equal(normalizePhone(input), "+972501234567");
  assert.equal(normalizePhone("02-1234567"), "+97221234567");
  assert.equal(normalizePhone("077-1234567"), "+972771234567");
});
test("rejects foreign, malformed, short and injected numbers", () => {
  for (const input of [
    "+12025550123",
    "12345",
    "05012345678",
    "++972501234567",
    "0501234567<script>",
    "+9720501234567",
  ])
    assert.throws(() => normalizePhone(input));
});
