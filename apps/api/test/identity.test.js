import test from "node:test";
import assert from "node:assert/strict";
import { hashToken, hashPassword, verifyPassword, verifyBootstrapToken } from "../src/identity.js";

test("passwords are stored as Argon2id hashes and verified", async () => {
  const password = "correct horse battery staple";
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.match(hash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(hash, password), true);
  assert.equal(await verifyPassword(hash, "incorrect password"), false);
});

test("missing account passwords still use a dummy hash path", async () => {
  assert.equal(await verifyPassword(undefined, "not-the-password"), false);
});

test("opaque session token hashes are stable SHA-256 hex digests", () => {
  const token = "random-session-token";
  const digest = hashToken(token);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(hashToken(token), digest);
  assert.notEqual(hashToken(token), hashToken("another-token"));
});

test("bootstrap authorization requires the configured secret", () => {
  const previous = process.env.DX_BOOTSTRAP_TOKEN;
  process.env.DX_BOOTSTRAP_TOKEN = "expected-secret-value-that-is-long-enough-32-characters";
  assert.equal(verifyBootstrapToken("expected-secret"), true);
  assert.equal(verifyBootstrapToken("wrong-secret"), false);
  assert.equal(verifyBootstrapToken(""), false);
  if (previous === undefined) delete process.env.DX_BOOTSTRAP_TOKEN;
  else process.env.DX_BOOTSTRAP_TOKEN = previous;
});
