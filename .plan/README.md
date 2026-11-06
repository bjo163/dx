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
- Design users, organizations, memberships, sessions and roles with migrations.
- Implement password hashing, secure cookie sessions, CSRF defense and rate limits.
- Add organization-scoped authorization tests to every project endpoint.
- Acceptance: cross-organization reads and writes are denied by tests.

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

## Global execution rules
- Inspect existing code before editing; preserve working behavior.
- Use JavaScript ESM and Fastify; do not introduce TypeScript, Express or Prisma.
- One task per PR/commit; tests and docs ship with each behavior change.
- Do not expose the service publicly until DX-004 and the security baseline are complete.
- Do not claim deployment execution is available until DX-008 and DX-009 acceptance criteria pass.
