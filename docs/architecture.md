# DX architecture

DX is a self-hosted deployment control plane, not a general-purpose PaaS runtime in the first milestone.

- **Web cockpit:** Next.js workspace and operational UI.
- **API:** Fastify control-plane boundary and the only trusted place to resolve identity, organization membership and permissions.
- **PostgreSQL:** durable platform state, including users, organizations, memberships, sessions and project metadata.
- **Redis:** queue coordination foundation; worker integration comes later.
- **Runner (planned):** isolated execution environment for clone/build/release jobs. It must not share API credentials or trust repository scripts.

Request flow: Browser → Next.js same-origin routes → Fastify API → PostgreSQL. Authentication will use opaque, random browser session tokens; only token hashes are persisted. The API resolves the user and active organization membership from the session on every protected request. Project queries must be scoped by the resolved organization, never by an organization identifier trusted from the browser.

The identity schema foundation is introduced through an additive PostgreSQL migration. It does not yet enable login or protect existing project endpoints. The cockpit remains private until authentication, owner bootstrap, organization-scoped authorization, CSRF protection and rate limits are implemented and tested.

Future deploy requests will be persisted as jobs, claimed by a worker, executed in an isolated runner, then reported as structured events and logs.

Constraints: JavaScript ESM by default; keep web and API independently deployable; never mount the Docker socket into public web/API containers; never interpolate user input into shell commands; use explicit adapters for Git providers, builders, registries, DNS and runtime targets; persist deployment state transitions.
