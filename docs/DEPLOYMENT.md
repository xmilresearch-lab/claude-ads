# Deployment Guide

This guide covers production deployment using Docker Compose (self-hosted) or a PaaS like Railway/Render.

---

## Environment Variables Checklist

Copy `.env.example` to `.env` and fill in every value before deploying.

### Required

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://user:pass@db:5432/automation_db` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379/0` |
| `ANTHROPIC_API_KEY` | Claude API key (starts with `sk-ant-`) | `sk-ant-...` |
| `SECRET_KEY` | 256-bit hex — signs JWTs | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | 256-bit hex — AES-256-GCM for credentials | `openssl rand -hex 32` |
| `MCP_AUTH_TOKEN` | Shared bearer token for MCP servers | `openssl rand -hex 32` |

### Optional (OAuth integrations)

| Variable | Description |
|---|---|
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | Twitter OAuth app credentials |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth app credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth app credentials (Gmail) |
| `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET` | HubSpot OAuth app credentials |
| `OAUTH_REDIRECT_URI` | OAuth callback URL (must match app registration) |

### Service URLs

| Variable | Default | Description |
|---|---|---|
| `SOCIAL_MCP_URL` | `http://social-mcp:3001` | Social MCP server |
| `EMAIL_MCP_URL` | `http://email-mcp:3002` | Email MCP server |
| `CRM_MCP_URL` | `http://crm-mcp:3003` | CRM MCP server |
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` | Claude model identifier |

---

## Docker Compose (Production)

```yaml
version: "3.9"

services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SECRET_KEY=${SECRET_KEY}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/ready"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

  worker:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SECRET_KEY=${SECRET_KEY}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: celery -A app.workers.celery_app worker --loglevel=info --concurrency=4

  beat:
    build: ./backend
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - worker
    command: celery -A app.workers.celery_app beat --loglevel=info

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=automation_db
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d automation_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --save 60 1 --loglevel warning
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  social-mcp:
    build: ./mcp/social-mcp-server
    ports:
      - "3001:3001"
    environment:
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}

  email-mcp:
    build: ./mcp/email-mcp-server
    ports:
      - "3002:3002"
    environment:
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}

  crm-mcp:
    build: ./mcp/crm-mcp-server
    ports:
      - "3003:3003"
    environment:
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}

volumes:
  postgres_data:
  redis_data:
```

---

## Database Migrations

Run migrations before starting the API for the first time and after every deploy:

```bash
# Inside the api container
alembic upgrade head
```

For zero-downtime deploys, run migrations as a pre-deploy step (Railway/Render support this natively).

---

## Health Check Configuration

| Endpoint | Purpose | Use For |
|---|---|---|
| `GET /health` | Liveness — process is alive | Kubernetes liveness probe |
| `GET /health/live` | Alias for `/health` | Load balancer health check |
| `GET /health/ready` | Readiness — DB + Redis + MCP reachable | Kubernetes readiness probe |

Readiness response states:

| State | HTTP | Meaning |
|---|---|---|
| `ready` | 200 | All dependencies healthy |
| `degraded` | 200 | Core OK; MCP servers unreachable (automations queue but don't publish) |
| `not_ready` | 503 | Postgres or Redis down — do not route traffic |

---

## Celery / Redis Sizing

| Component | Recommended Min | Notes |
|---|---|---|
| Redis memory | 512 MB | Rate limit counters + job queue + OAuth state |
| Celery workers | 2 processes × 4 threads | Scale horizontally for high automation volume |
| Celery beat | 1 process | Singleton — only one beat instance per deployment |

Set `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` both to `REDIS_URL` in production.

---

## Security Checklist

- [ ] `SECRET_KEY` and `ENCRYPTION_KEY` are unique random values (never reuse across environments)
- [ ] `DEBUG=false` in production
- [ ] Database credentials are not in source control (use secrets manager or PaaS env vars)
- [ ] CORS `ALLOWED_ORIGINS` lists only your frontend domain(s)
- [ ] MCP servers are not publicly reachable (internal network only)
- [ ] `pip-audit` passes with no HIGH/CRITICAL findings before each release
- [ ] Postgres TLS enabled (`?ssl=require` in `DATABASE_URL`)
- [ ] Redis AUTH enabled (`redis://:password@host:6379/0`)
