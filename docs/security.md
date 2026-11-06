# Security baseline

This is an early bootstrap. Do not expose it to the public internet as a multi-user service yet.

Before public deployment: implement authentication, organization isolation and RBAC on every API route; CSRF protection for cookie-authenticated mutations; secure cookies and rate limits; encryption at rest for secrets with scoped access and rotation; signed webhooks and replay protection; isolated build runners with resource quotas, network policy and ephemeral storage; audit trails; backups and restore tests; dependency scanning and security headers.

Never mount the Docker socket into web/API containers. Never execute repository-provided scripts in the control-plane process. The Compose database password is a local development placeholder and must be changed before shared use. Configure production CORS to a specific trusted origin alongside authentication.
