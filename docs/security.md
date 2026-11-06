# Security baseline

DX is an early self-hosted control-plane bootstrap. Keep it behind a private network or access-controlled HTTPS reverse proxy while hardening work continues.

## Implemented in the current bootstrap

- First-owner onboarding requires a server-side `DX_BOOTSTRAP_TOKEN` of at least 32 characters, is rate-limited, and is protected by a PostgreSQL advisory lock so only one initial owner can be created.
- Passwords are hashed with Argon2id. Unknown-account login attempts use a dummy Argon2id hash path to reduce email-enumeration timing differences.
- Browser sessions use cryptographically random opaque tokens; only SHA-256 token hashes are stored in PostgreSQL.
- Session cookies are HttpOnly and SameSite=Lax; production cookies are Secure when `COOKIE_SECURE=true`.
- Login attempts and first-owner setup are rate-limited; authentication errors are generic.
- Project listing and creation require a valid session and are scoped to the organization resolved from server-side membership. Project creation checks the member role.
- Project creation and logout require a matching CSRF cookie/header pair whose hash is verified against the stored session.
- The Next.js same-origin proxy rejects cross-origin browser mutations. The cockpit sends CSP, frame, MIME, referrer and permissions headers.

## Remaining security work

- Configure HSTS at the TLS termination proxy.
- Add PostgreSQL-backed integration tests for concurrent first-owner setup, valid/invalid login, session expiry/revocation, CSRF rejection, login throttling and cross-organization isolation.
- Add password reset/rotation, invitations, organization switching and session revocation across all devices.
- Add audit events for identity and project mutations.
- Add encryption at rest for future deployment secrets with scoped access and rotation.
- Verify signed webhooks, timestamps and replay/idempotency keys.
- Build isolated runners with resource quotas, network policy and ephemeral storage.
- Add backups, restore tests, dependency scanning and threat-model review.

## Non-negotiable boundaries

Never mount the Docker socket into web/API containers. Never execute repository-provided scripts in the control-plane process. Never trust an organization ID or role supplied by the browser as authorization evidence. Never store raw session tokens, passwords, credentials or secret values in logs or audit metadata.

The Compose database password is a local development placeholder and must be changed before shared use. Production CORS is disabled at the API boundary; browser requests must pass through the same-origin Next.js proxy. Do not expose the API, database or Redis ports publicly.

## Current limitations

The first-owner bootstrap token is required only until initial setup succeeds; after that, the endpoint permanently rejects further setup attempts because an account exists. Remove or rotate the bootstrap secret after initialization. Configure HSTS at the TLS termination proxy. Existing projects without an organization ID are intentionally hidden from organization-scoped queries until an explicit ownership-transfer workflow is available.

The platform is not yet production-ready for unrestricted public multi-tenant use. Git provider integration and deployment execution remain blocked until the remaining security work and isolated runner acceptance criteria pass.
