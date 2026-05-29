# AI Automation Platform — Operations Runbook

## First-Time Production Deployment

### Prerequisites

- Ubuntu 22.04+ server (min 4 CPU, 8 GB RAM recommended)
- Docker + Docker Compose v2 installed
- Domain name with DNS pointing to server
- SSL certificate (Let's Encrypt recommended)
- GitHub repo with secrets configured (see [GitHub Secrets](#github-secrets-required))

### Step-by-Step First Deploy

**Step 1: Clone and configure**

```bash
git clone https://github.com/your-org/automation-platform.git /opt/automation-platform
cd /opt/automation-platform
cp .env.example .env.prod
# Edit .env.prod — fill in all values
```

**Step 2: SSL certificate**

```bash
mkdir -p backend/nginx/ssl

# Option A: Let's Encrypt (recommended)
certbot certonly --standalone -d yourdomain.com
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem backend/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem  backend/nginx/ssl/

# Option B: Self-signed (dev/staging only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout backend/nginx/ssl/privkey.pem \
  -out   backend/nginx/ssl/fullchain.pem
```

**Step 3: Generate secure keys**

```bash
python -c "import secrets; print('SECRET_KEY='     + secrets.token_hex(32))"
python -c "import secrets; print('ENCRYPTION_KEY=' + secrets.token_hex(32))"
python -c "import secrets; print('MCP_AUTH_TOKEN=' + secrets.token_urlsafe(32))"
# Copy these into .env.prod
```

**Step 4: Start MCP servers** (on same host or separate)

```bash
cd mcp/social-mcp-server && npm run build && node dist/index.js &
cd mcp/email-mcp-server  && npm run build && node dist/index.js &
cd mcp/crm-mcp-server    && npm run build && node dist/index.js &
```

**Step 5: Start all services**

```bash
cd /opt/automation-platform/backend
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d
```

**Step 6: Verify**

```bash
curl https://yourdomain.com/health
curl https://yourdomain.com/health/ready
```

Expected:
- `/health` → `{"status":"ok"}`
- `/health/ready` → `{"status":"ready"}` (or `"degraded"` if MCP servers not yet up)

---

## GitHub Secrets Required

| Secret | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key (starts with `sk-ant-`) |
| `PROD_HOST` | Production server IP or hostname |
| `PROD_USER` | SSH username on the production server |
| `PROD_SSH_KEY` | SSH private key (full contents of `~/.ssh/id_rsa`) |
| `PROD_DOMAIN` | Production domain name, no `https://` prefix |

Configure at: **GitHub repo → Settings → Secrets and variables → Actions**

The `deploy` job also requires a GitHub **environment** named `production` with a required reviewer, providing manual approval before each production deploy.

---

## Common Operations

### View logs

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f celery_worker_high
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Restart a single service

```bash
# Zero-downtime for API (2 replicas — one stays up during restart)
docker compose -f docker-compose.prod.yml restart api

# Restart a worker tier
docker compose -f docker-compose.prod.yml restart celery_worker_high
```

### Scale workers up

```bash
docker compose -f docker-compose.prod.yml up -d --scale celery_worker_medium=4
```

### Run a database migration manually

```bash
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

### Open a database shell

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

### Check Celery worker status

```bash
docker compose -f docker-compose.prod.yml exec celery_worker_high \
  celery -A app.workers.celery_app inspect active
```

### Emergency: pause all automations

```bash
# 1. Set all automations inactive via DB shell
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE automations SET active = false;"

# 2. Restart workers to flush in-progress tasks
docker compose -f docker-compose.prod.yml restart \
  celery_worker_high celery_worker_medium celery_worker_low
```

### SSL certificate renewal

```bash
# Let's Encrypt auto-renewal (add to cron or use certbot timer)
certbot renew --quiet
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem backend/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem  backend/nginx/ssl/
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## Troubleshooting

| Symptom | Check | Fix |
|---|---|---|
| API returns 503 | `docker ps` — api container running? | `docker compose restart api` |
| Automations not running | Celery Beat logs | Check cron expression; `docker compose restart celery_beat` |
| Webhooks not processing | Worker high queue depth | `docker compose up -d --scale celery_worker_high=4` |
| DB connection errors | postgres container healthy? | `docker compose restart postgres` |
| MCP tools failing | MCP server health endpoints | Restart the failing MCP server |
| High token usage | `GET /api/v1/analytics/tokens` | Review automation configs for runaway prompts |
| Rate limit errors (429) | Redis running? | `docker compose restart redis` |
| Nginx 502 | API containers starting? | `docker compose logs api` — wait for startup validation |
| OOM kills | `docker stats` | Add swap or increase container memory limits |

---

## Monitoring Checklist (Daily)

- [ ] `/health/ready` returns `"ready"` (not `"degraded"`)
- [ ] Celery queue depth < 100: `docker compose exec redis redis-cli LLEN celery`
- [ ] Error rate in API logs < 1%: `docker compose logs api | grep -c '"status":5'`
- [ ] Latest backup file exists and is non-zero: `ls -lh /backups/postgres/ | tail -5`
- [ ] `pip-audit` (run weekly): no HIGH/CRITICAL CVEs
