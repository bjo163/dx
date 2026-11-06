# DX roadmap

Tasks are bounded so autonomous agents can implement them without product clarification.

## M0 — Foundation
- [x] Monorepo, workspace scripts and Docker Compose.
- [x] Next.js cockpit shell with API status.
- [x] Fastify health/readiness and project CRUD endpoints.
- [x] PostgreSQL initial schema.
- [x] Add GitHub Actions CI for workspace lint, API tests, build and Compose validation.
- [ ] Verify CI completes and run a clean Docker image build/smoke test.

## M1 — Identity and workspace
- [ ] Add users, organizations, memberships and sessions.
- [ ] Implement secure sessions and password hashing.
- [ ] Add organization-scoped authorization to every project route.
- [ ] Add audit events for mutations.
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
