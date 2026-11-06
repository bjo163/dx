import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import pg from "pg";
import { validateProjectPayload } from "./project-validation.js";
import {
  createSession, clearSessionCookies, getSession, hashPassword,
  requireAuth, requireCsrf, verifyBootstrapToken, verifyPassword
} from "./identity.js";

const { Pool } = pg;
const app = Fastify({ logger: true, trustProxy: false });
const port = Number(process.env.PORT || 4000);
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
app.decorate("pg", pool);

await app.register(cors, { origin: process.env.NODE_ENV === "production" ? false : true });
await app.register(cookie);
await app.register(rateLimit, { global: false });

app.get("/health", async () => ({ status: "ok", service: "dx-api" }));

app.get("/ready", async (_request, reply) => {
  if (!pool) return reply.code(503).send({ status: "not_ready", reason: "DATABASE_URL is not configured" });
  try { await pool.query("SELECT 1"); return { status: "ready", database: "connected" }; }
  catch { return reply.code(503).send({ status: "not_ready", database: "unavailable" }); }
});

app.get("/api/setup/status", async (_request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database is not configured." });
  const { rows } = await pool.query("SELECT EXISTS (SELECT 1 FROM users) AS initialized");
  return { initialized: rows[0].initialized };
});

app.post("/api/setup/owner", {
  config: { rateLimit: { max: 5, timeWindow: "1 minute" } }
}, async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database is not configured." });
  const body = request.body && typeof request.body === "object" ? request.body : {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const organizationName = typeof body.organizationName === "string" ? body.organizationName.trim() : "";
  const organizationSlug = typeof body.organizationSlug === "string" ? body.organizationSlug.trim().toLowerCase() : "";
  if (!verifyBootstrapToken(body.bootstrapToken)) return reply.code(403).send({ error: "Setup authorization failed." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return reply.code(400).send({ error: "Enter a valid email address." });
  if (password.length < 12 || password.length > 128) return reply.code(400).send({ error: "Password must contain 12 to 128 characters." });
  if (!organizationName || organizationName.length > 100) return reply.code(400).send({ error: "Organization name must contain 1 to 100 characters." });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organizationSlug) || organizationSlug.length > 80) return reply.code(400).send({ error: "Organization slug must use lowercase letters, numbers and single hyphens." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(724031)");
    const existing = await client.query("SELECT EXISTS (SELECT 1 FROM users) AS initialized");
    if (existing.rows[0].initialized) {
      await client.query("ROLLBACK");
      return reply.code(409).send({ error: "DX has already been initialized." });
    }
    const passwordHash = await hashPassword(password);
    const user = await client.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, passwordHash]
    );
    const organization = await client.query(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name, slug",
      [organizationName, organizationSlug]
    );
    await client.query(
      "INSERT INTO organization_memberships (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
      [organization.rows[0].id, user.rows[0].id]
    );
    await client.query("COMMIT");
    await createSession(pool, reply, user.rows[0].id);
    return reply.code(201).send({ data: { user: user.rows[0], organization: organization.rows[0], role: "owner" } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") return reply.code(409).send({ error: "Email or organization slug is already registered." });
    throw error;
  } finally { client.release(); }
});

app.post("/api/auth/login", {
  config: { rateLimit: { max: 5, timeWindow: "1 minute" } }
}, async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database is not configured." });
  const body = request.body && typeof request.body === "object" ? request.body : {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const { rows } = await pool.query(
    "SELECT id, email, password_hash, disabled_at FROM users WHERE lower(email) = $1 LIMIT 1",
    [email]
  );
  const user = rows[0];
  const valid = user && !user.disabled_at && await verifyPassword(user.password_hash, password);
  if (!valid) return reply.code(401).send({ error: "Email or password is incorrect." });
  const membership = await pool.query("SELECT 1 FROM organization_memberships WHERE user_id = $1 LIMIT 1", [user.id]);
  if (!membership.rowCount) return reply.code(403).send({ error: "Account has no active organization membership." });
  await createSession(pool, reply, user.id);
  return { data: { user: { id: user.id, email: user.email } } };
});

app.get("/api/auth/me", { preHandler: requireAuth }, async request => ({
  data: { user: request.auth.user, organization: request.auth.organization, role: request.auth.role }
}));

app.post("/api/auth/logout", { preHandler: [requireAuth, requireCsrf] }, async (request, reply) => {
  await pool.query("UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL", [request.auth.id]);
  clearSessionCookies(reply);
  return { status: "signed_out" };
});

app.get("/api/projects", { preHandler: requireAuth }, async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database is not configured" });
  const { rows } = await pool.query(
    "SELECT id, name, slug, repository_url, default_branch, created_at FROM projects WHERE organization_id = $1 ORDER BY created_at DESC",
    [request.auth.organization.id]
  );
  return { data: rows };
});

app.post("/api/projects", { preHandler: [requireAuth, requireCsrf] }, async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database is not configured" });
  if (!["owner", "admin", "developer"].includes(request.auth.role)) return reply.code(403).send({ error: "Insufficient role." });
  const validation = validateProjectPayload(request.body);
  if (validation.error) return reply.code(400).send({ error: validation.error });
  const { name, slug, repositoryUrl, defaultBranch } = validation.value;
  try {
    const result = await pool.query(
      "INSERT INTO projects (organization_id, name, slug, repository_url, default_branch) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, slug, repository_url, default_branch, created_at",
      [request.auth.organization.id, name, slug, repositoryUrl, defaultBranch]
    );
    return reply.code(201).send({ data: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return reply.code(409).send({ error: "Project slug already exists." });
    throw error;
  }
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  reply.code(500).send({ error: "Internal server error" });
});
app.addHook("onClose", async () => { if (pool) await pool.end(); });
try { await app.listen({ host: "0.0.0.0", port }); }
catch (error) { app.log.error(error); process.exit(1); }
