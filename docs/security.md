# Security baseline

This is an early bootstrap. Do not expose it to the public internet as a multi-user service yet.

## Current status

The project registry API is still unauthenticated. The identity database foundation is being introduced, but schema presence alone does not provide authentication or authorization. Keep the cockpit private and loopback-bound until the full identity milestone is complete.

## Identity requirements

- Store only normalized email addresses and strong password hashes produced by a maintained password-hashing implementation (prefer Argon2id; never store plaintext passwords or reversible password encryption).
- Store only cryptographic hashes of opaque session and CSRF tokens. Generate raw tokens with a cryptographically secure random source and show them only to the browser once.
- Sessions must expire, be revocable, and be invalidated when a user is disabled or a password is reset.
- Use HttpOnly, Secure in production, and an appropriate SameSite cookie policy. Enforce CSRF validation on cookie-authenticated state changes.
- Resolve organization membership and role on the server for every request. Never accept an organization or role supplied by the browser as authorization evidence.
- Scope every project read and write by the authenticated organization. Cross-organization access must fail closed and be covered by tests.
- Rate-limit login and other credential-sensitive endpoints; return generic authentication errors that do not disclose whether an email exists.

Before public deployment: implement authentication, organization isolation and RBAC on every API route; CSRF protection for cookie-authenticated mutations; secure cookies and rate limits; encryption at rest for secrets with scoped access and rotation; signed webhooks and replay protection; isolated build runners with resource quotas, network policy and ephemeral storage; audit trails; backups and restore tests; dependency scanning and security headers.

Never mount the Docker socket into web/API containers. Never execute repository-provided scripts in the control-plane process. The Compose database password is a local development placeholder and must be changed before shared use. Configure production CORS to a specific trusted origin alongside authentication.