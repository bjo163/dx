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

## 3. Temporary direct-IP preview (not production)

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

## 4. Recommended network shape

For a persistent preview, keep both published services on loopback and put a TLS reverse proxy (for example Caddy or Nginx) in front of the web service. Only expose 80/443. This does not replace the missing application authentication; keep the site access-restricted until the identity milestone is complete.

## 5. Diagnose common failures

- `connection refused`: check `docker compose ps`, container logs, and whether the web port is bound to `0.0.0.0` or loopback as intended.
- Browser timeout: check provider firewall/security group and host firewall. A timeout is different from a process refusing a connection.
- Web container exits: inspect `docker compose logs --tail=200 web`; a Next.js build/start failure will appear there.
- API unavailable in cockpit: inspect API health and logs. Inside Compose, web must use `http://api:4000`, not `localhost:4000`.
- Database not ready: inspect `docker compose logs --tail=100 postgres` and verify `POSTGRES_PASSWORD` matches the database's initial configuration. Changing the environment password does not rewrite an existing persistent database volume.

## 6. Useful support bundle

Run these commands and share the output (redact secrets and public IPs if desired):

```bash
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 api
docker compose config --services
sudo ufw status
```

Never share `.env`, database URLs, tokens, private keys or full unredacted environment dumps.
