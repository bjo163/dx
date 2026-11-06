# DX execution plan

This plan is autonomous and safe to execute in small, isolated tasks. Do not require product-owner approval for implementation details already defined here. Never weaken the security boundaries in docs/security.md.

## DX-001 — Establish reproducible CI
- Add GitHub Actions for pnpm install, lint, build and Docker Compose config validation.
- Pin Node 22 and pnpm 9; enable dependency caching.
- Acceptance: clean checkout passes CI; no secrets required.

## DX-002 — API integration tests
- Add Node test-runner tests for health, readiness, project input validation and duplicate slug behavior.
- Use an ephemeral PostgreSQL service in CI; do not mock SQL semantics.
- Acceptance: tests cover success, invalid payload, conflict and unavailable database.

## DX-003 — Project workspace UI
- Build project list, create-project form, loading/error/empty states and API integration.
- Keep API origin server-side; validate inputs in both UI and API.
- Acceptance: a project created in the cockpit persists and appears after reload.

## DX-004 — Identity foundation

### DX-004A — Identity persistence schema
- Add additive, repeatable PostgreSQL migration for users, organizations, memberships, constrained roles and sessions.
- Store only password hashes and SHA-256-sized hashes of opaque session/CSRF tokens; never store raw session tokens.
- Mount the migration for fresh volumes and document explicit application for existing persistent volumes.
- Acceptance: migration is idempotent, does not delete existing project data, and can be applied to an existing database without changing current project API behavior.

### DX-004B — Authentication primitives
- Add password hashing using a maintained Argon2id implementation and constant-time verification.
- Add cryptographically random opaque session and CSRF tokens; persist only token hashes.
- Add login/logout/current-session endpoints, expiry, revocation and disabled-user handling.
- Set HttpOnly cookies; require Secure in production and explicit SameSite policy.
- Acceptance: tests cover valid/invalid login, generic credential errors, expiry, logout/revocation and disabled accounts.

### DX-004C — First-owner bootstrap
- Provide a one-time, race-safe owner bootstrap that cannot be invoked after an owner exists.
- Never ship a default password or public unauthenticated account-creation endpoint.
- Acceptance: concurrent bootstrap attempts produce exactly one owner; repeat attempts are denied.

### DX-004D — Organization-scoped authorization
- Add organization_id to projects with a safe backfill strategy for existing rows.
- Resolve organization membership and role server-side; do not trust client-supplied organization or role.
- Require membership for project list/create and scope every query by organization_id.
- Add role checks for mutations and tests for cross-organization denial.
- Acceptance: a user cannot read or mutate another organization's projects, even when guessing UUIDs/slugs.

### DX-004E — CSRF, rate limits and security headers
- Protect cookie-authenticated mutations with CSRF validation and origin checks.
- Rate-limit login and bootstrap attempts with bounded, privacy-safe keys.
- Add security headers and production CORS allowlist configuration.
- Acceptance: automated tests prove unsafe cross-origin mutations and abusive login bursts are rejected.

## DX-005 — Audit events
- Persist actor, organization, action, resource, timestamp and safe metadata for every mutation.
- Never store credentials, tokens or secret values in audit metadata.
- Acceptance: project create/update/delete events are queryable and immutable to normal users.

## DX-006 — Git provider adapter
- Define provider-neutral interfaces and implement GitHub App installation flow.
- Verify webhook signatures, timestamps and replay/idempotency keys.
- Acceptance: repository metadata can be read without storing long-lived personal access tokens.

## DX-007 — Deployment state machine and queue
- Add jobs/releases schema and explicit queued, preparing, building, deploying, ready, failed, cancelled states.
- Integrate Redis queue with bounded retries, exponential backoff and dead-letter handling.
- Acceptance: duplicate webhook delivery cannot create duplicate active deployments.

## DX-008 — Isolated build runner
- Separate runner from control-plane containers and credentials.
- Apply CPU, memory, disk, process, network and time limits; use ephemeral workspaces.
- Redact secrets and guarantee cleanup on success, failure, timeout and cancellation.
- Acceptance: adversarial fixture cannot read API secrets or access host Docker socket.

## DX-009 — Runtime adapters
- Define deploy, health-check, rollback and destroy interfaces.
- Implement one documented target adapter with immutable release metadata.
- Acceptance: failed rollout can be rolled back and audited.

## DX-010 — Operations readiness
- Add structured logs, metrics, backups, restore verification, retention and upgrade docs.
- Add security headers, dependency scanning and threat-model review.
- Acceptance: documented restore drill and security checklist pass.

## DX-011 — VPS deployment reliability
- Document first-time VPS deployment, safe bind defaults, temporary direct-IP preview, firewall boundaries and support diagnostics.
- Add healthchecks for API and web; start web only after API is healthy.
- Acceptance: `docker compose config` validates, Compose health reports accurately, and docs never instruct operators to expose API/database/Redis ports.

## Global execution rules
- Inspect existing code before editing; preserve working behavior.
- Use JavaScript ESM and Fastify; do not introduce TypeScript, Express or Prisma.
- One task per PR/commit; tests and docs ship with each behavior change.
- Do not expose the service publicly until DX-004 and the security baseline are complete.
- Do not claim deployment execution is available until DX-008 and DX-009 acceptance criteria pass.

## Execution status — 2026-11-06

- [x] Project registry onboarding UI: list, create form, API proxy, empty and error states.
- [x] Project payload validation extracted into a reusable module and covered by Node tests.
- [x] GitHub Actions CI now runs workspace lint, API tests, workspace build and Compose validation.
- [x] VPS deployment guide, safe direct-IP preview procedure and Compose healthchecks.
- [x] DX-004A identity persistence schema added as an additive PostgreSQL migration; fresh-install mounting and existing-volume upgrade instructions documented.
- [ ] DX-004B–004E authentication, owner bootstrap, organization-scoped authorization, CSRF, rate limits and security headers remain incomplete.
- [ ] CI runner completion and Docker image build/smoke verification remain pending.
- [ ] Git provider integration remains blocked on the full identity and authorization baseline.
