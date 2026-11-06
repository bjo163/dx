import Fastify from "fastify";
import cors from "@fastify/cors";
import pg from "pg";
import { validateProjectPayload } from "./project-validation.js";

const { Pool } = pg;
const app = Fastify({ logger: true, trustProxy: false });
const port = Number(process.env.PORT || 4000);
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

await app.register(cors, { origin: process.env.NODE_ENV === "production" ? false : true });
app.get("/health", async () => ({ status: "ok", service: "dx-api" }));

app.get("/ready", async (_request, reply) => {
  if (!pool) return reply.code(503).send({ status: "not_ready", reason: "DATABASE_URL is not configured" });
  try { await pool.query("SELECT 1"); return { status: "ready", database: "connected" }; }
  catch { return reply.code(503).send({ status: "not_ready", database: "unavailable" }); }
});

app.get("/api/projects", async (_request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database is not configured" });
  const { rows } = await pool.query("SELECT id, name, slug, repository_url, default_branch, created_at FROM projects ORDER BY created_at DESC");
  return { data: rows };
});

app.post("/api/projects", async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database is not configured" });
  const validation = validateProjectPayload(request.body);
  if (validation.error) return reply.code(400).send({ error: validation.error });
  const { name, slug, repositoryUrl, defaultBranch } = validation.value;
  try {
    const result = await pool.query("INSERT INTO projects (name, slug, repository_url, default_branch) VALUES ($1, $2, $3, $4) RETURNING id, name, slug, repository_url, default_branch, created_at", [name, slug, repositoryUrl, defaultBranch]);
    return reply.code(201).send({ data: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return reply.code(409).send({ error: "Project slug already exists." });
    throw error;
  }
});

app.setErrorHandler((error, _request, reply) => { app.log.error(error); reply.code(500).send({ error: "Internal server error" }); });
app.addHook("onClose", async () => { if (pool) await pool.end(); });
try { await app.listen({ host: "0.0.0.0", port }); }
catch (error) { app.log.error(error); process.exit(1); }
