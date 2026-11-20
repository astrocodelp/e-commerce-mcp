import test from "node:test";
import assert from "node:assert/strict";
import { checkSecret, seal, unseal } from "../lib/crypto";

test("seal/unseal round-trips and hides the plaintext", () => {
  process.env.ADMIN_SECRET = "test-secret";
  const s = seal({ token: "abc" });
  assert.ok(!s.includes("abc"));
  assert.deepEqual(unseal(s), { token: "abc" });
});
test("a different secret cannot decrypt", () => {
  process.env.ADMIN_SECRET = "one"; const s = seal({ a: 1 });
  process.env.ADMIN_SECRET = "two"; assert.equal(unseal(s), null);
});
test("checkSecret is exact", () => {
  process.env.ADMIN_SECRET = "pw";
  assert.ok(checkSecret("pw")); assert.ok(!checkSecret("PW")); assert.ok(!checkSecret(""));
});
