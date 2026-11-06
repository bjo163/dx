# DX architecture

DX is a self-hosted deployment control plane, not a general-purpose PaaS runtime in the first milestone.

- **Web cockpit:** Next.js workspace and operational UI.
- **API:** Fastify control-plane boundary, project metadata and orchestration endpoints.
- **PostgreSQL:** durable platform state.
- **Redis:** queue coordination foundation; worker integration comes later.
- **Runner (planned):** isolated execution environment for clone/build/release jobs. It must not share API credentials or trust repository scripts.

Request flow: Browser → Next.js cockpit → Fastify API → PostgreSQL. Future deploy requests will be persisted as jobs, claimed by a worker, executed in an isolated runner, then reported as structured events and logs.

Constraints: JavaScript ESM by default; keep web and API independently deployable; never mount the Docker socket into public web/API containers; never interpolate user input into shell commands; use explicit adapters for Git providers, builders, registries, DNS and runtime targets; persist deployment state transitions.
