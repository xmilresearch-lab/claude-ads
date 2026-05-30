# AI Automation Platform — API Reference

> Base URL: `https://api.yourplatform.com`  
> Interactive docs: `GET /docs` (Swagger UI) | `GET /redoc` (ReDoc)  
> OpenAPI schema: `GET /openapi.json`

---

## Authentication

All endpoints except `/api/v1/auth/register` and `/api/v1/auth/login` require a Bearer token.

```http
Authorization: Bearer <access_token>
```

### Token Lifecycle

| Endpoint | Purpose | Expiry |
|---|---|---|
| `POST /api/v1/auth/register` | Create account + workspace | — |
| `POST /api/v1/auth/login` | Get access + refresh tokens | Access: 30 min, Refresh: 30 days |
| `POST /api/v1/auth/refresh` | Rotate access token using refresh token | — |
| `GET /api/v1/auth/me` | Get current user info | — |

### Example: Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

Response:
```json
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer"
  },
  "meta": { "request_id": "uuid", "timestamp": "2024-01-01T00:00:00Z" }
}
```

---

## Rate Limits

Rate limits are enforced per IP address. Workspace-level limits are enforced separately.

| Endpoint Group | Limit |
|---|---|
| Auth (`/api/v1/auth/*`) | 10 requests / minute |
| Read (`GET`) | 300 requests / minute |
| Write (`POST`, `PUT`, `PATCH`, `DELETE`) | 60 requests / minute |
| Automation trigger (`POST /automations/{id}/run`) | 30 requests / minute |
| Analytics export (`GET /analytics/export`) | 10 requests / hour |
| Webhooks (`POST /webhooks/*`) | 200 requests / minute |

When a limit is exceeded, the API returns:
```json
HTTP 429 Too Many Requests

{
  "errors": [{ "code": "rate_limited", "message": "Too many requests", "field": null }],
  "meta": { "request_id": "uuid", "timestamp": "..." }
}
```

---

## Response Format

### Success — DataResponse

Single-object responses:

```json
{
  "data": { "id": "uuid", "name": "My Automation", "..." : "..." },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Success — PaginatedResponse

List responses include pagination fields in `meta`:

```json
{
  "data": [{ "id": "uuid", "..." : "..." }],
  "meta": {
    "request_id": "uuid",
    "timestamp": "2024-01-01T12:00:00Z",
    "total_count": 42,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### Error — ErrorResponse

```json
{
  "errors": [
    {
      "code": "validation_error",
      "message": "field required",
      "field": "name"
    }
  ],
  "meta": {
    "request_id": "uuid",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `bad_request` | Malformed request |
| 400 | `injection_blocked` | Input contains prompt injection patterns |
| 401 | `unauthorized` | Missing or expired Bearer token |
| 403 | `forbidden` | Resource belongs to a different workspace |
| 404 | `not_found` | Resource does not exist |
| 409 | `conflict` | Duplicate resource (e.g., email already registered) |
| 422 | `validation_error` | Request body or query param failed Pydantic validation |
| 429 | `rate_limited` | Per-IP rate limit exceeded |
| 429 | `workspace_rate_limit` | Per-workspace automation run limit exceeded |
| 500 | `internal_error` | Unhandled server error |
| 500 | `orchestration_failed` | Automation orchestration pipeline failed |

---

## Endpoints

### Auth — `/api/v1/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Register new user + workspace |
| `POST` | `/login` | Login and receive JWT tokens |
| `POST` | `/refresh` | Refresh access token |
| `GET` | `/me` | Get current user info |

### Workspaces — `/api/v1/workspaces`

| Method | Path | Description |
|---|---|---|
| `GET` | `/me` | Get workspace with counts |
| `PATCH` | `/me` | Update workspace name or settings |
| `GET` | `/me/brand-voice` | Get brand voice config |
| `PUT` | `/me/brand-voice` | Replace brand voice config |
| `DELETE` | `/me/brand-voice` | Remove brand voice config |
| `GET` | `/me/settings` | Get workspace settings JSONB |
| `PATCH` | `/me/settings` | Deep-merge workspace settings |

### Automations — `/api/v1/automations`

| Method | Path | Description |
|---|---|---|
| `POST` | `/` | Create automation |
| `GET` | `/` | List automations (paginated) |
| `GET` | `/{id}` | Get automation |
| `PATCH` | `/{id}` | Update automation |
| `DELETE` | `/{id}` | Delete automation |
| `POST` | `/{id}/run` | Trigger manual run |
| `GET` | `/{id}/runs` | List run history (paginated) |

### Content Queue — `/api/v1/content`

| Method | Path | Description |
|---|---|---|
| `GET` | `/queue` | List pending items |
| `GET` | `/{id}` | Get content item |
| `PATCH` | `/{id}/approve` | Approve for publishing |
| `PATCH` | `/{id}/reject` | Reject with reason |
| `DELETE` | `/{id}` | Delete item permanently |

### Audit Logs — `/api/v1/audit`

| Method | Path | Description |
|---|---|---|
| `GET` | `/logs` | List audit logs (paginated, filterable) |
| `GET` | `/logs/{id}` | Get single audit log |
| `GET` | `/summary` | 30-day summary stats |

### Integrations — `/api/v1/integrations`

| Method | Path | Description |
|---|---|---|
| `GET` | `` | List integrations |
| `GET` | `/{id}` | Get integration |
| `GET` | `/{id}/status` | Live health check |
| `POST` | `/oauth/initiate` | Start OAuth flow |
| `POST` | `/oauth/callback` | Complete OAuth flow |
| `POST` | `/apikey` | Connect via API key |
| `DELETE` | `/{id}` | Disconnect integration |

### Analytics — `/api/v1/analytics`

| Method | Path | Description |
|---|---|---|
| `GET` | `/overview` | Aggregated KPIs |
| `GET` | `/automations` | Per-automation breakdown |
| `GET` | `/platforms` | Per-platform content counts |
| `GET` | `/tokens` | Daily token usage series |
| `GET` | `/export` | Export as JSON or CSV |

---

## Webhooks

Webhooks are not versioned and live at the root path:

```
POST /webhooks/{provider}
```

Supported providers: `twitter`, `linkedin`, `gmail`, `hubspot`, `salesforce`, `sendgrid`, `zendesk`.

Include the workspace webhook secret in the `X-Webhook-Secret` header. All webhook payloads are scanned for injection patterns before processing.

---

## Pagination

All list endpoints accept:

| Parameter | Default | Max | Description |
|---|---|---|---|
| `limit` | 50 | 200 | Items per page |
| `offset` | 0 | — | Skip this many items |

Use `meta.has_more` to detect if more pages exist. Walk pages with `offset += limit`.

---

## SDK Codegen Hints

The OpenAPI schema includes vendor extensions for SDK generators:

| Extension | Value | Meaning |
|---|---|---|
| `x-mutation` | `true` | POST/PUT/PATCH/DELETE operations |
| `x-paginated` | `true` | GET operations returning paginated lists |
| `x-rate-limit` | e.g. `"60/minute"` | Effective rate limit string for this operation |
| `info.x-api-conventions` | object | Shared conventions (date format, ID format, etc.) |
