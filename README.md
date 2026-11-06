# DX — Developer Experience Platform

A self-hostable, Node.js-first deployment control plane: a small, understandable alternative to Coolify, built around a Next.js cockpit and Fastify API.

> Status: bootstrap foundation. The dashboard and API run locally. Build/deploy execution is intentionally not enabled until isolated runners, authentication, secrets handling and authorization are implemented.

## Stack
- Next.js App Router cockpit
- Fastify control-plane API (ESM JavaScript)
- PostgreSQL durable state
- Redis queue foundation
- Node.js 22, pnpm workspaces, Docker Compose

## Quick start
Requirements: Docker Engine + Docker Compose plugin.

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000 (cockpit), http://localhost:4000/health (API health), and http://localhost:4000/ready (database readiness).

## Local development
Node.js 22+ and pnpm 9+:

```bash
corepack enable
pnpm install
pnpm dev
```

## Current scope
- [x] Monorepo, Compose stack and service boundaries
- [x] Next.js cockpit shell
- [x] Fastify health/readiness and project CRUD API
- [x] PostgreSQL schema bootstrap
- [ ] Authentication, organizations and RBAC
- [ ] Git provider integration and build queue
- [ ] Isolated deployment runner and runtime adapter
- [ ] Logs, domains, TLS, backups and observability

See [architecture](docs/architecture.md), [roadmap](docs/roadmap.md), and [security baseline](docs/security.md).

## Security boundary
The API is a control plane, not a privileged Docker socket proxy. Never mount the Docker socket into the public web/API containers or execute repository-provided commands in the API process. Build and deployment jobs must run in isolated workers with resource limits, scoped credentials, audit events and guaranteed cleanup. Do not expose this bootstrap publicly before authentication and authorization exist.
