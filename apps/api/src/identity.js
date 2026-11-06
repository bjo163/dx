import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";

const SESSION_COOKIE = "dx_session";
const CSRF_COOKIE = "dx_csrf";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export const hashToken = value => createHash("sha256").update(value).digest("hex");
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash, password) {
  try { return await argon2.verify(hash, password); }
  catch { return false; }
}

export async function createSession(pool, reply, userId) {
  const sessionToken = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    "INSERT INTO user_sessions (user_id, token_hash, csrf_token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [userId, hashToken(sessionToken), hashToken(csrfToken), expiresAt]
  );
  const secure = process.env.NODE_ENV === "production";
  reply.setCookie(SESSION_COOKIE, sessionToken, {
    httpOnly: true, secure, sameSite: "lax", path: "/", expires: expiresAt
  });
  reply.setCookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false, secure, sameSite: "lax", path: "/", expires: expiresAt
  });
}

export function clearSessionCookies(reply) {
  const secure = process.env.NODE_ENV === "production";
  for (const name of [SESSION_COOKIE, CSRF_COOKIE]) {
    reply.clearCookie(name, { path: "/", secure, sameSite: "lax" });
  }
}

export async function getSession(pool, request) {
  const token = request.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT s.id AS session_id, s.csrf_token_hash, s.expires_at,
            u.id AS user_id, u.email, u.disabled_at,
            m.organization_id, m.role, o.name AS organization_name, o.slug AS organization_slug
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN organization_memberships m ON m.user_id = u.id
       JOIN organizations o ON o.id = m.organization_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()
        AND u.disabled_at IS NULL
      ORDER BY m.created_at ASC
      LIMIT 1`,
    [hashToken(token)]
  );
  const session = rows[0];
  if (!session) return null;
  return {
    id: session.session_id,
    user: { id: session.user_id, email: session.email },
    organization: { id: session.organization_id, name: session.organization_name, slug: session.organization_slug },
    role: session.role,
    csrfTokenHash: session.csrf_token_hash
  };
}

export async function requireAuth(request, reply) {
  const session = await getSession(request.server.pg, request);
  if (!session) return reply.code(401).send({ error: "Authentication required." });
  request.auth = session;
}

export async function requireCsrf(request, reply) {
  const cookie = request.cookies?.[CSRF_COOKIE];
  const header = request.headers["x-csrf-token"];
  if (!cookie || !header || !safeEqual(cookie, header) ||
      !safeEqual(hashToken(cookie), request.auth?.csrfTokenHash)) {
    return reply.code(403).send({ error: "CSRF validation failed." });
  }
}

export function verifyBootstrapToken(provided) {
  const expected = process.env.DX_BOOTSTRAP_TOKEN;
  return Boolean(expected && provided && safeEqual(provided, expected));
}
