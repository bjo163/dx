# DX architecture

DX is a self-hosted deployment control plane, not a general-purpose PaaS runtime in the first milestone.

- **Web cockpit:** Next.js workspace, first-run owner onboarding and authenticated operational UI.
- **API:** Fastify control-plane boundary; validates sessions, resolves organization membership and enforces project authorization.
- **PostgreSQL:** durable state for users, organizations, memberships, hashed sessions and organization-scoped project metadata.
- **Redis:** queue coordination foundation; worker integration comes later.
- **Runner (planned):** isolated execution environment for clone/build/release jobs. It must not share API credentials or trust repository scripts.

## Identity and onboarding flow

On first boot, the cockpit checks setup status. The owner initializes the instance using a server-side `DX_BOOTSTRAP_TOKEN`, owner email/password and organization details. The API creates the user, organization and owner membership in one transaction protected by a PostgreSQL advisory lock. The first owner is then signed in with an opaque session cookie.

Passwords are Argon2id hashes. Session and CSRF tokens are cryptographically random; only their SHA-256 hashes are persisted. Session cookies are HttpOnly and SameSite=Lax, with Secure enabled in production. The CSRF cookie is readable by the browser and must match the request header and stored session hash for protected mutations.

The API resolves the user's organization membership from the session on each protected request. Project queries are scoped by that resolved organization, never by an organization identifier trusted from the browser. Existing projects without an organization ID remain hidden until an explicit ownership-transfer flow exists.

## Request and deployment flow

Browser → Next.js same-origin routes → Fastify API → PostgreSQL. Future deploy requests will be persisted as jobs, claimed by a worker, executed in an isolated runner, then reported as structured events and logs.

Constraints: JavaScript ESM by default; keep web and API independently deployable; never mount the Docker socket into public web/API containers; never interpolate user input into shell commands; use explicit adapters for Git providers, builders, registries, DNS and runtime targets; persist deployment state transitions.

Authentication and basic tenant-scoped project access are implemented, but the platform is not yet production-ready for public multi-tenant use. Password reset, invitations, organization switching, audit events, HSTS at the TLS termination proxy, PostgreSQL-backed security integration tests and isolated deployment runners remain future work.
