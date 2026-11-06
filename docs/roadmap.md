# DX roadmap

Tasks are bounded so autonomous agents can implement them without product clarification.

## M0 — Foundation
- [x] Monorepo, workspace scripts and Docker Compose.
- [x] Next.js cockpit shell with API status.
- [x] Fastify health/readiness and project CRUD endpoints.
- [x] PostgreSQL initial schema.
- [x] GitHub Actions CI for workspace lint, API tests, build and Compose validation.
- [ ] Verify CI completes and run a clean Docker image build/smoke test.

## M1 — Identity and workspace
- [x] Add users, organizations, memberships and sessions.
- [x] Implement Argon2id password hashing, opaque sessions, login/logout and one-time owner bootstrap.
- [x] Add first-run onboarding for owner account and initial organization.
- [x] Add organization-scoped authorization to project list/create routes and role checks.
- [x] Add CSRF validation, login/setup rate limits, same-origin proxy checks and baseline cockpit security headers.
- [ ] Verify PostgreSQL-backed identity/tenant integration suite in CI; configure HSTS at the TLS proxy.
- [ ] Add password reset, invitations, organization switching and audit events.
- [x] Build project onboarding/list UI against the API (same-origin Next.js proxy, create form, live registry, empty/error states).

## M2 — Git and build orchestration
- [ ] GitHub App integration with least-privilege permissions.
- [ ] Repository records, signed webhook verification and replay protection.
- [ ] Deployment/job schema with idempotency and explicit state machine.
- [ ] Redis-backed worker queue with retry/backoff and dead-letter handling.
- [ ] Build adapter interface and read-only Dockerfile detection.

## M3 — Isolated runner
- [ ] Runner service without control-plane credentials.
- [ ] CPU, memory, disk, process and wall-clock quotas.
- [ ] Ephemeral workspaces and guaranteed cleanup.
- [ ] Per-job Git/registry credentials and log redaction.
- [ ] Cancellation, timeout, retry and orphan recovery tests.

## M4 — Runtime and operations
- [ ] Deployment targets, immutable release records, health checks and rollback.
- [ ] Domains and TLS behind provider adapters.
- [ ] Log streaming, metrics, backup/restore and retention policies.
- [ ] Upgrade process, operator docs and disaster-recovery drills.

Definition of ready: validation, authorization, tests, failure handling, operational documentation and safe defaults. A running container does not mean deployment execution is complete.
