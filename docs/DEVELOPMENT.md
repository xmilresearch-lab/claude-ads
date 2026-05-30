# Development Guide

Get the backend running locally in five commands, then follow the conventions below to extend it.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker + Docker Compose | 24+ | https://docs.docker.com/get-docker/ |
| Python | 3.11+ | via `pyenv` or system package manager |
| Node.js | 20+ | via `nvm` or system package manager |
| `uv` (optional) | latest | `pip install uv` — faster than pip |

---

## Quick Start (5 Commands)

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd claude-ads

# 2. Copy and fill environment variables
cp backend/.env.example backend/.env
# Edit backend/.env — at minimum set ANTHROPIC_API_KEY and SECRET_KEY

# 3. Start all services (API, DB, Redis, Celery, MCP servers)
docker compose up -d

# 4. Run database migrations
docker compose exec api alembic upgrade head

# 5. Verify everything is healthy
curl http://localhost:8000/health/ready
```

The API is now available at `http://localhost:8000`.  
Swagger UI: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

---

## Running Tests

```bash
# All tests
cd backend && pytest tests/ -v

# Unit tests only (fast — no Docker required)
pytest tests/unit/ -v

# Integration tests (require running services OR full mocking)
pytest tests/integration/ -v

# With coverage
pytest tests/ --cov=app --cov-report=term-missing

# A single test file
pytest tests/unit/test_automations_api.py -v

# Run and stop on first failure
pytest tests/ -x
```

---

## Development Workflow

### Linting and Type Checking

```bash
# Lint (auto-fix)
ruff check app/ --fix

# Format
black app/

# Type check
mypy app/
```

### Making Schema Changes

1. Edit the SQLAlchemy model in `app/models/`
2. Generate a migration: `alembic revision --autogenerate -m "describe change"`
3. Review the generated file in `migrations/versions/`
4. Apply: `alembic upgrade head`

---

## Adding a New Automation Type

New automation types are processed by the orchestration engine in `app/services/orchestration.py`.

1. **Add the type string** to the `AutomationCreate` schema in `app/schemas/automation.py`:
   ```python
   type: Literal["social_post", "email_campaign", "crm_update", "your_new_type"]
   ```

2. **Add a handler branch** in `run_automation()` in `app/services/orchestration.py`:
   ```python
   elif automation.type == "your_new_type":
       result = await _run_your_new_type(automation, trigger_payload, workspace, db)
   ```

3. **Implement the handler** — it must:
   - Scan `trigger_payload` through `injection_scanner`
   - Build a Claude prompt including `workspace.brand_voice`
   - Call Claude via the appropriate MCP server tools
   - Run output through `dlp_scanner` before any external API call
   - Write result to `AutomationRun` and `AuditLog`

4. **Write tests** in `tests/unit/` covering happy path, injection block, and DLP block cases.

---

## Adding a New MCP Server

1. **Scaffold the TypeScript project** in `mcp/<name>-mcp-server/`:
   ```bash
   cd mcp && cp -r social-mcp-server your-mcp-server
   ```

2. **Implement tools** following the naming convention `{service}_{action}_{resource}`.  
   Each tool must include `readOnlyHint`, `destructiveHint`, and `idempotentHint` annotations.

3. **Register the server URL** in `app/core/config.py`:
   ```python
   YOUR_MCP_URL: str = "http://localhost:3004"
   ```

4. **Add a health check** in `main.py` inside `health_ready()`:
   ```python
   _check_http("your_mcp", f"{settings.YOUR_MCP_URL}/health"),
   ```

5. **Add to `docker-compose.yml`** with `MCP_AUTH_TOKEN` passed as an env var.

6. **Write MCP evals** in `tests/mcp-evals/` as XML evaluation files.

---

## Architecture Overview

```
Request
  └─ FastAPI (main.py)
       ├─ Middleware: request_id → CORS → security_headers → rate_limiter
       ├─ Router: /api/v1/{domain}
       │    ├─ Dependency: get_db (AsyncSession)
       │    ├─ Dependency: get_current_workspace (auth + DB lookup)
       │    └─ Service call: app/services/
       │         └─ orchestration.py → Claude API via MCP tools
       └─ Exception handlers → ErrorResponse envelope
```

All database calls are async via SQLAlchemy 2.0 (`select()` style).  
All external HTTP calls use `httpx.AsyncClient`.  
Background tasks run via Celery workers connected to Redis.

---

## Environment Variables Reference

See `.env.example` for the full list. The minimum set for local development:

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/automation_db
REDIS_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=<32-byte hex>
ENCRYPTION_KEY=<32-byte hex>
MCP_AUTH_TOKEN=dev-token
SOCIAL_MCP_URL=http://localhost:3001
EMAIL_MCP_URL=http://localhost:3002
CRM_MCP_URL=http://localhost:3003
```
