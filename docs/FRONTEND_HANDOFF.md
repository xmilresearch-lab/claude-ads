# Frontend Integration Handoff

## API Overview

| | URL |
|---|---|
| Dev base URL | `http://localhost:8000/api/v1` |
| Prod base URL | `https://yourdomain.com/api/v1` |
| OpenAPI schema | `GET /openapi.json` |
| Interactive docs | `GET /docs` (disabled in production via Nginx) |

All requests except `POST /auth/register` and `POST /auth/login` require:

```
Authorization: Bearer <access_token>
```

**Response envelope (success):**

```json
{
  "data": { "...": "..." },
  "meta": { "request_id": "uuid", "timestamp": "2024-01-01T00:00:00Z" }
}
```

**Response envelope (error):**

```json
{
  "errors": [{ "code": "not_found", "message": "Automation not found", "field": null }],
  "meta": { "request_id": "uuid", "timestamp": "2024-01-01T00:00:00Z" }
}
```

---

## Authentication Flow

```
1. POST /auth/register  { email, password }
   → { data: { access_token, refresh_token, token_type: "bearer" } }

2. Store access_token in memory (NOT localStorage — XSS risk)
   Store refresh_token in httpOnly cookie

3. Attach to every request:
   Authorization: Bearer {access_token}

4. On 401: POST /auth/refresh  { refresh_token }
   → { data: { access_token, token_type: "bearer" } }
   Replace in-memory access_token, retry original request.

5. On refresh 401: redirect to /login (refresh token expired)
```

Tokens expire:
- Access token: **30 minutes**
- Refresh token: **30 days**

---

## Key Flows for the Dashboard

### Onboarding Flow

```
1. POST /auth/register        → create user
2. GET  /workspaces/me        → workspace auto-created on first login
3. PUT  /workspaces/me/brand-voice  → { tone, examples[], avoid[] }
4. POST /integrations/oauth/initiate  { type: "twitter" }
   → { data: { auth_url } } — redirect user to auth_url
5. User returns to OAuth callback URL
6. POST /integrations/oauth/callback  { code, state }
   → integration saved, encrypted credentials stored
```

### Create and Trigger an Automation

```
1. POST /automations
   Body: { name, type, config: {...}, schedule?: "0 9 * * 1-5" }
   → { data: { id, status: "active", ... } }

2. POST /automations/{id}/run
   → { data: { run_id, status: "pending" } }   ← returns immediately

3. Poll GET /automations/{id}/runs until status != "pending"
   status values: "pending" | "running" | "success" | "failed"
```

Polling recommendation — React Query:

```ts
useQuery({
  queryKey: ['runs', automationId],
  queryFn:  () => api.get(`/automations/${automationId}/runs`),
  refetchInterval: (data) =>
    data?.pages[0]?.data[0]?.status === 'pending' ? 3000 : false,
})
```

### Content Approval Workflow

```
1. GET  /content/queue?status=pending    → list items awaiting review
2. Display content to user
3. PATCH /content/{id}/approve           → triggers publish via MCP server
   PATCH /content/{id}/reject  { reason? }
```

Content item states: `pending` → `approved` / `rejected` → `published` / `failed`

### Analytics Dashboard

```
GET /analytics/overview?days=30    → summary KPI cards
GET /analytics/tokens?days=30      → daily token usage series (for line chart)
GET /analytics/platforms           → platform breakdown (for pie/bar chart)
GET /analytics/automations         → per-automation run stats (for table)
GET /analytics/export?format=csv   → CSV download (streams, use <a download>)
```

---

## Pagination Pattern

All list endpoints accept `?limit=20&offset=0`.

Response `meta` includes:

```json
{ "total_count": 143, "limit": 20, "offset": 0, "has_more": true }
```

Frontend pattern:

```ts
const loadMore = () => setOffset(offset + limit);
const hasMore  = meta.has_more;
```

---

## WebSocket / Polling

The API is **REST-only** — no WebSockets in v1.

For real-time automation run status, poll `GET /automations/{id}/runs` every 3 seconds and stop when `status` is `"success"` or `"failed"`. See the React Query snippet above.

---

## Rate Limits

| Endpoint | Limit | Frontend UX |
|---|---|---|
| `POST /auth/login` | 10 / min | Show "too many attempts, wait 60s" after 5 tries |
| `POST /automations/{id}/run` | 30 / min | Disable trigger button for 2 s after click |
| `GET` endpoints | 300 / min | No special handling needed |
| `POST /analytics/export` | 10 / hour | Disable export button with countdown |

All `429` responses include a `Retry-After` header (seconds).

---

## Error Codes Reference

| `code` | HTTP | When | Frontend action |
|---|---|---|---|
| `validation_error` | 422 | Invalid request body | Show `field`-specific inline error |
| `injection_blocked` | 400 | User input contained injection patterns | Show generic "invalid input" |
| `workspace_rate_limit` | 429 | Daily automation quota exceeded | Show upgrade prompt |
| `orchestration_failed` | 500 | Claude/MCP error during automation run | Show retry button |
| `unauthorized` | 401 | Missing or expired token | Refresh token, then redirect to login |
| `not_found` | 404 | Resource doesn't exist or wrong workspace | Show 404 page |
| `internal_error` | 500 | Unexpected server error | Show generic error toast |

---

## Recommended Frontend Stack

| Concern | Recommendation |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query (React Query) v5 |
| Forms | React Hook Form + Zod (mirrors backend validation) |
| Charts | Recharts (for analytics) |
| Auth | Custom httpOnly cookie pattern (refresh token) + in-memory access token |
| API client | Auto-generated from `/openapi.json` using `openapi-typescript` |

---

## Generate TypeScript Client

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/lib/api.types.ts
```

This gives fully-typed request/response types from the live OpenAPI schema. Pair with a thin fetch wrapper that handles auth headers, envelope unwrapping, and token refresh:

```ts
// src/lib/api.ts
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${getAccessToken()}`, ...init?.headers },
  });
  if (res.status === 401) {
    await refreshAccessToken();   // retry once after refresh
    return apiFetch(path, init);
  }
  const body = await res.json();
  if (!res.ok) throw new ApiError(body.errors);
  return body.data as T;
}
```

---

## Environment Variables (Next.js)

```bash
# .env.local (dev)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# .env.production
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
```

---

## CORS Configuration

The API allows requests from origins listed in `ALLOWED_ORIGINS`. For development, `http://localhost:3000` is pre-configured. For production, set:

```bash
ALLOWED_ORIGINS=["https://yourdomain.com"]
```

Allowed methods: `GET POST PATCH PUT DELETE OPTIONS`  
Allowed headers: `Authorization Content-Type X-Request-ID`

---

## Key API Endpoints Quick Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET`  | `/auth/me` | Current user |
| `GET`  | `/workspaces/me` | Current workspace |
| `PUT`  | `/workspaces/me` | Update workspace settings |
| `PUT`  | `/workspaces/me/brand-voice` | Update brand voice |
| `GET`  | `/automations` | List automations |
| `POST` | `/automations` | Create automation |
| `GET`  | `/automations/{id}` | Get automation |
| `PATCH`| `/automations/{id}` | Update automation |
| `DELETE`| `/automations/{id}` | Delete automation |
| `POST` | `/automations/{id}/run` | Trigger run |
| `GET`  | `/automations/{id}/runs` | Run history |
| `GET`  | `/content/queue` | Pending content |
| `PATCH`| `/content/{id}/approve` | Approve content |
| `PATCH`| `/content/{id}/reject` | Reject content |
| `GET`  | `/integrations` | List integrations |
| `POST` | `/integrations/oauth/initiate` | Start OAuth flow |
| `POST` | `/integrations/oauth/callback` | Complete OAuth flow |
| `GET`  | `/integrations/{id}/health` | Integration health check |
| `GET`  | `/audit` | Audit log |
| `GET`  | `/analytics/overview` | KPI summary |
| `GET`  | `/analytics/tokens` | Token usage series |
| `GET`  | `/analytics/platforms` | Platform breakdown |
| `GET`  | `/analytics/automations` | Automation stats |
| `GET`  | `/analytics/export` | Export (CSV/JSON) |
| `GET`  | `/health` | Liveness |
| `GET`  | `/health/ready` | Readiness |
