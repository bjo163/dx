import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { createApp } from "../src/app.js";
import { hashPassword, hashToken } from "../src/identity.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;

function cookiesFrom(response) {
  const values = response.headers["set-cookie"];
  const list = Array.isArray(values) ? values : values ? [values] : [];
  return list.map(value => value.split(";")[0]);
}

function cookieHeader(values) {
  return values.join("; ");
}

function cookieValue(values, name) {
  const pair = values.find(value => value.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : "";
}

test("identity onboarding, sessions, CSRF and organization isolation", { skip: !databaseUrl }, async () => {
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  assert.match(databaseName, /test/i, "TEST_DATABASE_URL must point to a dedicated test database");
  process.env.NODE_ENV = "test";
  process.env.COOKIE_SECURE = "false";
  process.env.DX_BOOTSTRAP_TOKEN = "dx-test-bootstrap-secret-0123456789abcdef0123456789abcdef";

  const pool = new Pool({ connectionString: databaseUrl });
  const app = await createApp({ pool, logger: false });
  try {
    await pool.query("DROP TABLE IF EXISTS projects, user_sessions, organization_memberships, organizations, users CASCADE");
    await pool.query(await readFile(new URL("../../../infra/postgres/init.sql", import.meta.url), "utf8"));
    await pool.query(await readFile(new URL("../../../infra/postgres/migrations/002_identity.sql", import.meta.url), "utf8"));
    await pool.query(await readFile(new URL("../../../infra/postgres/migrations/003_project_tenant_scope.sql", import.meta.url), "utf8"));
    await pool.query(await readFile(new URL("../../../infra/postgres/migrations/004_project_org_slug_unique.sql", import.meta.url), "utf8"));

    const setupPayload = {
      bootstrapToken: process.env.DX_BOOTSTRAP_TOKEN,
      email: "owner@example.test",
      password: "owner-password-strong-123",
      organizationName: "DX Owner Workspace",
      organizationSlug: "dx-owner"
    };
    const setupResponses = await Promise.all([
      app.inject({ method: "POST", url: "/api/setup/owner", payload: setupPayload }),
      app.inject({ method: "POST", url: "/api/setup/owner", payload: setupPayload })
    ]);
    assert.deepEqual(setupResponses.map(response => response.statusCode).sort(), [201, 409]);
    const ownerSetup = setupResponses.find(response => response.statusCode === 201);
    const ownerCookies = cookiesFrom(ownerSetup);
    const ownerCookieHeader = cookieHeader(ownerCookies);
    const ownerCsrf = cookieValue(ownerCookies, "dx_csrf");
    assert.ok(cookieValue(ownerCookies, "dx_session"));
    assert.ok(ownerCsrf);

    const setupStatus = await app.inject({ method: "GET", url: "/api/setup/status" });
    assert.deepEqual(setupStatus.json(), { initialized: true });
    const anonymousProjects = await app.inject({ method: "GET", url: "/api/projects" });
    assert.equal(anonymousProjects.statusCode, 401);

    const currentOwner = await app.inject({
      method: "GET", url: "/api/auth/me", headers: { cookie: ownerCookieHeader }
    });
    assert.equal(currentOwner.statusCode, 200);
    assert.equal(currentOwner.json().data.role, "owner");

    const missingCsrf = await app.inject({
      method: "POST", url: "/api/projects", headers: { cookie: ownerCookieHeader },
      payload: { name: "Owner Project", slug: "owner-project" }
    });
    assert.equal(missingCsrf.statusCode, 403);

    const ownerProject = await app.inject({
      method: "POST", url: "/api/projects",
      headers: { cookie: ownerCookieHeader, "x-csrf-token": ownerCsrf },
      payload: { name: "Owner Project", slug: "owner-project" }
    });
    assert.equal(ownerProject.statusCode, 201);

    const secondPasswordHash = await hashPassword("second-user-password-123");
    const secondUser = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      ["viewer@example.test", secondPasswordHash]
    );
    const secondOrg = await pool.query(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      ["Second Workspace", "second-workspace"]
    );
    await pool.query(
      "INSERT INTO organization_memberships (organization_id, user_id, role) VALUES ($1, $2, 'viewer')",
      [secondOrg.rows[0].id, secondUser.rows[0].id]
    );

    const secondLogin = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { email: "viewer@example.test", password: "second-user-password-123" }
    });
    assert.equal(secondLogin.statusCode, 200);
    const secondCookies = cookiesFrom(secondLogin);
    const secondCookieHeader = cookieHeader(secondCookies);
    const secondCsrf = cookieValue(secondCookies, "dx_csrf");
    const secondProjects = await app.inject({
      method: "GET", url: "/api/projects", headers: { cookie: secondCookieHeader }
    });
    assert.deepEqual(secondProjects.json().data, []);
    const viewerWrite = await app.inject({
      method: "POST", url: "/api/projects",
      headers: { cookie: secondCookieHeader, "x-csrf-token": secondCsrf },
      payload: { name: "Forbidden Project", slug: "forbidden-project" }
    });
    assert.equal(viewerWrite.statusCode, 403);

    const ownerLogout = await app.inject({
      method: "POST", url: "/api/auth/logout",
      headers: { cookie: ownerCookieHeader, "x-csrf-token": ownerCsrf }
    });
    assert.equal(ownerLogout.statusCode, 200);
    const revokedSession = await app.inject({
      method: "GET", url: "/api/auth/me", headers: { cookie: ownerCookieHeader }
    });
    assert.equal(revokedSession.statusCode, 401);

    const ownerLogin = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { email: "owner@example.test", password: "owner-password-strong-123" }
    });
    assert.equal(ownerLogin.statusCode, 200);
    const renewedCookies = cookiesFrom(ownerLogin);
    const rawSessionToken = cookieValue(renewedCookies, "dx_session");
    await pool.query("UPDATE user_sessions SET expires_at = NOW() - INTERVAL '1 minute' WHERE token_hash = $1", [hashToken(rawSessionToken)]);
    const expiredSession = await app.inject({
      method: "GET", url: "/api/auth/me", headers: { cookie: cookieHeader(renewedCookies) }
    });
    assert.equal(expiredSession.statusCode, 401);

    const repeatedSetup = await app.inject({
      method: "POST", url: "/api/setup/owner", payload: setupPayload
    });
    assert.equal(repeatedSetup.statusCode, 409);

    const throttled = await Promise.all(Array.from({ length: 6 }, () =>
      app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "unknown@example.test", password: "invalid-password" } })
    ));
    assert.ok(throttled.some(response => response.statusCode === 429));
  } finally {
    await app.close();
    await pool.end();
  }
});
