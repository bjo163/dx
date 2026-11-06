# VPS deployment and troubleshooting

DX currently ships a bootstrap cockpit and project registry. It does **not** yet have login, organization isolation, RBAC or an isolated build runner. Treat it as a private preview, not a production multi-user deployment platform.

## 1. Prepare the host

Use a supported Linux VPS with Docker Engine and the Docker Compose v2 plugin.

```bash
docker --version
docker compose version
git clone https://github.com/bjo163/dx.git
cd dx
cp .env.example .env
```

Edit `.env`. Set a long random database password and keep the API bound to loopback:

```env
POSTGRES_PASSWORD=replace-with-a-long-random-value
WEB_BIND=127.0.0.1
WEB_PORT=3000
API_BIND=127.0.0.1
API_PORT=4000
```

Generate a password with `openssl rand -hex 32`. Do not commit `.env`.

## 2. Start and verify

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 api
```

Wait until `web`, `api`, `postgres` and `redis` show healthy (or running for services without a healthcheck).

Verify from the VPS:

```bash
curl -i http://127.0.0.1:3000/
curl -i http://127.0.0.1:4000/health
curl -i http://127.0.0.1:4000/ready
```

The API port is intentionally not public. The Next.js server proxies project requests to the API over the private Compose network.

## 3. Database schema updates

Fresh database volumes automatically execute the bootstrap SQL and the identity foundation migration mounted under `/docker-entrypoint-initdb.d`.

Existing persistent volumes do **not** rerun initialization scripts. After pulling a release that adds a migration, start PostgreSQL and apply the new migration explicitly:

```bash
docker compose up -d postgres
docker compose exec -T postgres psql -U dx -d dx -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/002-identity.sql
```

The current identity migration creates users, organizations, memberships, roles and hashed-session storage. It does not create an account, enable login, or protect project endpoints. Keep the service private until the remaining authentication and authorization work is complete. Back up the database before applying future migrations.


## 4. First-run owner onboarding

Before starting DX for the first time, create a unique bootstrap secret and place it in the private `.env` file:

```bash
openssl rand -hex 32
```

Set the output as `DX_BOOTSTRAP_TOKEN`. Never commit or paste this value into chat, logs or screenshots. Compose passes it only to the API container.

After pulling the release:

```bash
docker compose up -d --build
docker compose ps
```

Open the cockpit through your private reverse proxy or SSH tunnel. The first-run screen asks for the bootstrap secret, owner email, password (at least 12 characters), and organization name/slug. The first successful request creates the owner, organization and owner membership in one database transaction, then signs the browser in. A database advisory lock makes the bootstrap single-winner; later attempts are rejected.

For an existing persistent PostgreSQL volume, apply both new migrations after backing up the database:

```bash
docker compose up -d postgres
docker compose exec -T postgres psql -U dx -d dx -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/002-identity.sql
docker compose exec -T postgres psql -U dx -d dx -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/003-project-tenant-scope.sql
docker compose exec -T postgres psql -U dx -d dx -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/004-project-org-slug-unique.sql
```

Projects created before organization scoping remain unassigned and are intentionally not shown to the new organization. Do not manually assign them to an organization without verifying their ownership.

After onboarding, retain the bootstrap secret securely for disaster recovery procedures but do not leave it in a broadly readable shell history. Rotate it or remove it from the API environment once first-owner setup is complete; the setup endpoint also permanently rejects further attempts after an account exists.

## 5. Current authentication boundary

The cockpit requires login after initialization. Project listing and creation require a valid session; project creation and logout also require the CSRF token. Login attempts and first-owner setup are rate-limited. Session cookies are HttpOnly and SameSite=Lax; production cookies are Secure. Keep HTTPS enabled in production. Password reset, invitation flows, organization switching, audit events and a full security-header/CSP policy are not implemented yet.

## 6. Temporary direct-IP preview (not production)

For a short-lived test only, change `WEB_BIND` in `.env` to `0.0.0.0`, then recreate the web service:

```env
WEB_BIND=0.0.0.0
```

```bash
docker compose up -d --force-recreate web
docker compose ps
curl -I http://127.0.0.1:3000/
```

Allow TCP 3000 in the VPS provider firewall and host firewall only for your own source IP. Then test `http://YOUR_VPS_IP:3000/`. Do not expose port 4000 or the database/Redis ports.

**Important:** the current bootstrap has no authentication. Do not leave port 3000 open to the internet. After the connectivity test, restore `WEB_BIND=127.0.0.1` and recreate the service.

## 7. Recommended network shape

For a persistent preview, keep both published services on loopback and put a TLS reverse proxy (for example Caddy or Nginx) in front of the web service. Only expose 80/443. This does not replace the missing application authentication; keep the site access-restricted until the identity milestone is complete.

## 8. Diagnose common failures

- `connection refused`: check `docker compose ps`, container logs, and whether the web port is bound to `0.0.0.0` or loopback as intended.
- Browser timeout: check provider firewall/security group and host firewall. A timeout is different from a process refusing a connection.
- Web container exits: inspect `docker compose logs --tail=200 web`; a Next.js build/start failure will appear there.
- API unavailable in cockpit: inspect API health and logs. Inside Compose, web must use `http://api:4000`, not `localhost:4000`.
- Database not ready: inspect `docker compose logs --tail=100 postgres` and verify `POSTGRES_PASSWORD` matches the database's initial configuration. Changing the environment password does not rewrite an existing persistent database volume.

## 9. Useful support bundle

Run these commands and share the output (redact secrets and public IPs if desired):

```bash
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 api
docker compose config --services
sudo ufw status
```

Never share `.env`, database URLs, tokens, private keys or full unredacted environment dumps.
