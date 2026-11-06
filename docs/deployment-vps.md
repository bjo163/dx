# VPS deployment and troubleshooting

DX is a private self-hosted control plane. First-owner onboarding, login and organization-scoped project registry are implemented. Git provider integration and isolated build/deploy execution are not. Keep the cockpit behind a private network or access-controlled HTTPS reverse proxy.

## 1. Prepare the host

Use a supported Linux VPS with Docker Engine and the Docker Compose v2 plugin.

```bash
docker --version
docker compose version
git clone https://github.com/bjo163/dx.git
cd dx
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=production
POSTGRES_PASSWORD=replace-with-a-long-random-value
DX_BOOTSTRAP_TOKEN=replace-with-a-unique-random-secret
COOKIE_SECURE=true
WEB_BIND=127.0.0.1
WEB_PORT=3000
API_BIND=127.0.0.1
API_PORT=4000
```

Generate independent secrets with `openssl rand -hex 32`. Never commit `.env` or share the bootstrap token. The bootstrap token is passed only to the API container.

## 2. Start and verify

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 api
```

Verify from the VPS:

```bash
curl -i http://127.0.0.1:3000/
curl -i http://127.0.0.1:4000/health
curl -i http://127.0.0.1:4000/ready
```

The API port is intentionally not public. The Next.js server proxies browser requests to the API over the private Compose network.

## 3. First-run owner onboarding

Open the cockpit through your private reverse proxy or SSH tunnel. The first-run screen asks for the bootstrap secret, owner email, password (at least 12 characters), and organization name/slug.

The first successful request creates the owner, organization and owner membership in one database transaction. A PostgreSQL advisory lock makes bootstrap single-winner; later attempts are rejected. The browser is signed in automatically after successful setup.

After setup, remove or rotate `DX_BOOTSTRAP_TOKEN` in `.env` and recreate the API:

```bash
docker compose up -d --force-recreate api
```

The setup endpoint permanently rejects additional owner creation once a user exists, even if the bootstrap secret remains configured.

## 4. Database schema updates

Fresh database volumes automatically execute `infra/postgres/init.sql` and the ordered migrations mounted under `/docker-entrypoint-initdb.d`.

Existing persistent volumes do **not** rerun initialization scripts. Back up the database before applying migrations. After pulling a release that adds migrations:

```bash
docker compose up -d postgres
docker compose exec -T postgres psql -U dx -d dx -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/002-identity.sql
docker compose exec -T postgres psql -U dx -d dx -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/003-project-tenant-scope.sql
docker compose exec -T postgres psql -U dx -d dx -v ON_ERROR_STOP=1 -f /docker-entrypoint-initdb.d/004-project-org-slug-unique.sql
```

Projects created before organization scoping remain unassigned and are intentionally not shown to the first organization. Do not assign them to an organization without verifying ownership.

## 5. Current authentication boundary

The cockpit requires login after initialization. Passwords use Argon2id. Session cookies are HttpOnly and SameSite=Lax; production cookies are Secure. Project listing and creation require a valid session and are scoped to the authenticated organization. Project creation and logout require CSRF validation; browser mutations are checked for same-origin requests. Login and owner bootstrap are rate-limited.

The cockpit sends baseline CSP, frame, MIME, referrer and permissions headers. Configure HSTS at the HTTPS reverse proxy because TLS terminates there. Password reset, invitation flows, organization switching, audit events and PostgreSQL-backed security integration tests remain future work.

## 6. Temporary direct-IP preview (not recommended)

For a short connectivity test only, change `WEB_BIND` to `0.0.0.0` and recreate the web service:

```bash
docker compose up -d --force-recreate web
docker compose ps
curl -I http://127.0.0.1:3000/
```

Allow TCP 3000 in the VPS provider firewall and host firewall only for your own source IP. Test `http://YOUR_VPS_IP:3000/` for connectivity only, then restore `WEB_BIND=127.0.0.1` and recreate the web service. Do not complete onboarding or submit credentials over plain HTTP. Do not expose port 4000 or database/Redis ports.

## 7. Recommended network shape

Keep published services on loopback and put a TLS reverse proxy (for example Caddy or Nginx) in front of the web service. Only expose 80/443. Restrict the proxy by VPN, IP allowlist or an additional access-control layer until the remaining production hardening is complete. Configure HSTS at the TLS termination point.

## 8. Diagnose common failures

- `connection refused`: check `docker compose ps`, container logs, and whether the web port is bound to `0.0.0.0` or loopback as intended.
- Browser timeout: check provider firewall/security group and host firewall.
- Web container exits: inspect `docker compose logs --tail=200 web`.
- API unavailable in cockpit: inspect API health and logs. Inside Compose, web must use `http://api:4000`, not `localhost:4000`.
- Database not ready: inspect `docker compose logs --tail=100 postgres` and verify `POSTGRES_PASSWORD` matches the database's initial configuration. Changing the environment password does not rewrite an existing persistent database volume.
- Setup form returns authorization failed: verify `DX_BOOTSTRAP_TOKEN` in the API environment matches the secret entered in the browser. Never include it in diagnostic output.

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
