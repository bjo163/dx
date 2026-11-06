# DX — Developer Experience Platform

A self-hostable, Node.js-first deployment control plane: a small, understandable alternative to Coolify, built around a Next.js cockpit and Fastify API.

> Status: private bootstrap platform. First-owner onboarding, Argon2id login, secure sessions and organization-scoped project registry are implemented. Git provider integration and isolated build/deploy execution are not yet enabled. Keep the service behind private network or access-controlled HTTPS.

## Stack
- Next.js App Router cockpit with first-run onboarding and login
- Fastify control-plane API (ESM JavaScript)
- PostgreSQL durable state
- Redis queue foundation
- Node.js 22, pnpm workspaces, Docker Compose

## Quick start
Requirements: Docker Engine + Docker Compose plugin.

```bash
cp .env.example .env
# Generate a unique value with: openssl rand -hex 32
# Set it as DX_BOOTSTRAP_TOKEN in .env before first boot.
docker compose up --build
```

Open http://localhost:3000. On first boot, initialize the owner account and organization using the bootstrap secret. After initialization, the cockpit requires login. API health is available at http://localhost:4000/health and database readiness at http://localhost:4000/ready.

## VPS deployment
Follow [the VPS deployment and troubleshooting guide](docs/deployment-vps.md). Compose binds published ports to loopback by default. Do not expose the API, database or Redis ports publicly. Use HTTPS and a private/access-controlled reverse proxy for the cockpit.

## Local development
Node.js 22+ and pnpm 9+:

```bash
corepack enable
pnpm install
pnpm dev
```

## Current scope
- [x] Monorepo, Compose stack and service boundaries
- [x] Next.js cockpit shell and first-run owner onboarding
- [x] Argon2id login, opaque sessions, logout and CSRF-protected mutations
- [x] Organization-scoped project list/create and role check for project creation
- [x] GitHub Actions lint, API test, workspace build and Compose validation
- [x] PostgreSQL identity and tenant-scope migrations
- [ ] PostgreSQL integration tests for bootstrap concurrency, session lifecycle and cross-tenant denial
- [x] Same-origin mutation guard and baseline cockpit security headers
- [ ] HSTS at TLS proxy, password reset and invitations
- [ ] Git provider integration and build queue
- [ ] Isolated deployment runner and runtime adapter
- [ ] Logs, domains, TLS automation, backups and observability

See [architecture](docs/architecture.md), [roadmap](docs/roadmap.md), [execution plan](.plan/README.md), [VPS deployment](docs/deployment-vps.md), and [security baseline](docs/security.md).

## Security boundary
The API is a control plane, not a privileged Docker socket proxy. Never mount the Docker socket into the public web/API containers or execute repository-provided commands in the API process. Build and deployment jobs must run in isolated workers with resource limits, scoped credentials, audit events and guaranteed cleanup. This bootstrap is not yet production-ready for unrestricted public multi-tenant use.
