import test from "node:test";
import assert from "node:assert/strict";
import { validateProjectPayload } from "../src/project-validation.js";

test("accepts a minimal project and defaults its branch", () => {
  const result = validateProjectPayload({ name: "DX Web", slug: "dx-web" });
  assert.deepEqual(result.value, {
    name: "DX Web",
    slug: "dx-web",
    repositoryUrl: null,
    defaultBranch: "main"
  });
});

test("normalizes slug and trims project fields", () => {
  const result = validateProjectPayload({
    name: "  DX API  ",
    slug: " DX-API ",
    repositoryUrl: "https://github.com/bjo163/dx",
    defaultBranch: " dev "
  });
  assert.equal(result.value.slug, "dx-api");
  assert.equal(result.value.name, "DX API");
  assert.equal(result.value.defaultBranch, "dev");
});

test("rejects empty names and malformed slugs", () => {
  assert.ok(validateProjectPayload({ name: "", slug: "dx" }).error);
  assert.ok(validateProjectPayload({ name: "DX", slug: "DX project" }).error);
  assert.ok(validateProjectPayload({ name: "x".repeat(81), slug: "dx" }).error);
});

test("rejects repository URLs outside supported hosts and paths", () => {
  assert.ok(validateProjectPayload({ name: "DX", slug: "dx", repositoryUrl: "http://github.com/a/b" }).error);
  assert.ok(validateProjectPayload({ name: "DX", slug: "dx", repositoryUrl: "https://example.com/a/b" }).error);
  assert.ok(validateProjectPayload({ name: "DX", slug: "dx", repositoryUrl: "https://github.com/a/b/issues" }).error);
});

test("rejects invalid branch names", () => {
  assert.ok(validateProjectPayload({ name: "DX", slug: "dx", defaultBranch: "x".repeat(121) }).error);
});
