@AGENTS.md

# AI Automation Platform — Frontend

> Industrial Command Center aesthetic: dark, precise, amber-accented.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router (React 19) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v3 + custom design tokens |
| UI Primitives | Radix UI (Dialog, DropdownMenu, Tabs, Avatar, Progress, Toast) |
| Data Fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Auth State | In-memory access token + js-cookie refresh token |
| Notifications | Sonner |
| Charts | Recharts |
| Dates | date-fns |
| Icons | Lucide React |

---

## Design System (Never Break These Rules)

### Colors

| Token | Hex | Use ONLY for |
|---|---|---|
| `amber` | `#F59E0B` | Active nav indicator, primary CTA, live status dot, focus rings |
| `cyan` (`info`) | `#06B6D4` | Data values, chart lines, system metrics |
| `bg-base` | `#0A0B0F` | Page background |
| `bg-surface` | `#0D0E14` | Card backgrounds |
| `bg-elevated` | `#111318` | Elevated surfaces (modals, dropdowns) |
| `bg-overlay` | `#151820` | Hover states |
| `border` | `#1E2330` | Default borders |
| `text-primary` | `#F1F5F9` | Headings, primary content |
| `text-secondary` | `#94A3B8` | Labels, descriptions |
| `text-muted` | `#64748B` | Placeholder, disabled |

**NEVER use white backgrounds. NEVER use purple gradients. NEVER use `rounded-xl` cards.**

### Typography

| Font | Variable | Use |
|---|---|---|
| Syne | `font-display` | Page titles, hero headings |
| DM Sans | `font-sans` | Body text, labels, buttons |
| DM Mono | `font-mono` | IDs, tokens, code, metrics |

**All IDs, tokens, and numeric metrics must use `font-mono`.**

### Spacing & Shape

- Cards: `rounded-lg` (never `rounded-xl`)
- Borders: `border border-border` on all cards and inputs
- Focus rings: `focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base`

---

## Project Structure

```
/frontend
  /src
    /app
      /(auth)           → /login, /register (no sidebar)
      /(dashboard)      → /automations, /content, /integrations, /analytics, /settings
      /(admin)          → /admin, /admin/workspaces, /admin/usage, /admin/system
      layout.tsx        → Root layout: QueryProvider + AuthProvider + Toaster
      globals.css       → Tailwind directives + CSS variables + component classes
    /components
      /ui               → Primitive components (Button, Badge, Input, Card, etc.)
      /layout           → Sidebar, TopBar, PageHeader
      /auth             → LoginForm, RegisterForm
      /shared           → DataTable, EmptyState, LoadingSpinner, ConfirmDialog
    /lib
      /api
        client.ts       → Core fetch wrapper (ALL API calls go through here)
        automations.ts  → Automation CRUD functions
        content.ts      → Content queue functions
        analytics.ts    → Analytics functions
        workspaces.ts   → Workspace management functions
        admin.ts        → Admin-only functions
      /auth
        tokens.ts       → In-memory access token + cookie refresh token
      /hooks
        use-automations.ts
        use-content.ts
        use-analytics.ts
        use-workspaces.ts
      /providers
        auth-provider.tsx   → AuthContext (login, register, logout, user)
        query-provider.tsx  → TanStack Query client
      /utils
        cn.ts           → clsx + tailwind-merge
        format.ts       → date, number, duration formatters
  /public
  tailwind.config.ts
  tsconfig.json
  components.json
  .env.example
  .env.local
```

---

## Key Commands

```bash
# Development server
npm run dev

# Production build (must pass before any commit)
npm run build

# TypeScript type check (no emit)
npm run typecheck

# Lint
npm run lint

# Generate TypeScript types from backend OpenAPI
npm run gen-types
```

---

## API Client Rules

- **ALL API calls go through `src/lib/api/client.ts`** — never use `fetch()` directly in components
- `api.get<T>()`, `api.post<T>()`, `api.patch<T>()`, `api.put<T>()`, `api.delete<T>()` are the only allowed HTTP methods
- The client automatically:
  - Attaches the `Authorization: Bearer <accessToken>` header
  - Refreshes the access token on 401 using a shared `_refreshPromise` (no parallel refresh races)
  - Unwraps the `{ data, ... }` envelope — callers receive `T` directly
  - Throws `ApiError` with `{ status, message, code }` on non-2xx

---

## Auth Architecture

```
Access token  → stored in memory (_store object in tokens.ts) — NEVER localStorage
Refresh token → stored in js-cookie with secure: true, sameSite: "strict", 30-day expiry
```

- `getAccessToken()` / `setAccessToken()` / `clearAccessToken()` — in-memory only
- `getRefreshToken()` / `setRefreshToken()` / `clearRefreshToken()` — cookie-backed
- On app load: if refresh token cookie exists → call `GET /auth/me` → populate auth context
- On logout: clear both tokens, redirect to `/login`
- Middleware (`src/middleware.ts`) protects all routes server-side using the refresh token cookie

---

## TanStack Query Conventions

```typescript
// staleTime: 30_000 (30 seconds) for all queries
// retry: false on 401, 403, 404
// Keys: [resource, ...params] e.g. ["automations", workspaceId]
```

- Mutations always `invalidateQueries` on success
- Use `queryClient.setQueryData` for optimistic updates on single-entity fetches
- Never call API functions directly in components — always use the custom hooks in `/lib/hooks/`

---

## Form Conventions

```typescript
// All forms use React Hook Form + Zod
const schema = z.object({ ... });
type FormData = z.infer<typeof schema>;
const form = useForm<FormData>({ resolver: zodResolver(schema) });
```

- Display field errors inline below each input (`form.formState.errors.field.message`)
- Use `sonner` `toast.error()` for API errors, `toast.success()` for successful mutations
- Submit button shows loading state via `form.formState.isSubmitting`

---

## Route Groups

| Group | Path | Auth Required |
|---|---|---|
| `(auth)` | `/login`, `/register` | No — redirect to `/automations` if already authed |
| `(dashboard)` | `/automations`, `/content`, `/integrations`, `/analytics`, `/settings` | Yes — redirect to `/login` if not authed |
| `(admin)` | `/admin`, `/admin/workspaces`, `/admin/usage`, `/admin/system` | Yes + admin role |

Middleware redirects are handled in `src/middleware.ts`.

---

## Component Conventions

### Button variants (via CVA)
- `default` → amber background, dark text — primary CTA only
- `secondary` → surface background, secondary text
- `ghost` → transparent, hover overlay
- `destructive` → danger red
- `outline` → bordered, no fill
- `link` → underline only

### Badge variants (via CVA)
- `default` → amber (active/running states)
- `success` → green (completed states)
- `danger` → red (failed/error states)
- `warning` → yellow (paused/warning states)
- `info` → cyan (info/pending states)
- `secondary` → muted (inactive states)
- `outline` → bordered (draft states)

### Card structure
```tsx
<div className="card-command p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-display text-lg text-text-primary">Title</h3>
  </div>
  {/* content */}
</div>
```

### Status indicators
```tsx
<span className="status-live">Live</span>  {/* pulsing amber dot */}
```

---

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1   # Backend API base URL
NEXT_PUBLIC_APP_NAME=Automate                       # App display name
NEXT_PUBLIC_ADMIN_DOMAIN=admin                      # Admin subdomain prefix
```

All env vars prefixed `NEXT_PUBLIC_` are safe to expose to the browser.
Never put secrets in `NEXT_PUBLIC_` variables.

---

## Common Mistakes to Avoid

- **Do NOT** use `fetch()` directly — always use `src/lib/api/client.ts`
- **Do NOT** store the access token in `localStorage` or `sessionStorage`
- **Do NOT** use `rounded-xl` — use `rounded-lg`
- **Do NOT** use white or light backgrounds — minimum dark shade is `bg-bg-surface`
- **Do NOT** use purple or blue for branding — amber (`#F59E0B`) is the only accent
- **Do NOT** use Inter font — use Syne (display), DM Sans (body), DM Mono (code)
- **Do NOT** import from `@tanstack/react-query` in page components — use custom hooks
- **Do NOT** call `router.push()` for auth redirects in middleware — use `NextResponse.redirect()`
- **Do NOT** render IDs, tokens, or metrics in `font-sans` — always `font-mono`
- **Do NOT** skip Zod validation on any form input
- **Do NOT** add settings sub-nav links to the sidebar's `NAV_ITEMS` array — they live in `SETTINGS_SUB_NAV` inside `sidebar.tsx` and expand only on `/settings/*` paths
- **Do NOT** use `fetch()` directly in test files — mock API calls via vitest `vi.mock()`

---

## Sprint Map

| Sprint | Focus | Status |
|---|---|---|
| F1 | Next.js scaffold, design system, auth, layout, dashboard shell | ✅ Done |
| F2 | Workspace setup, brand voice, onboarding, settings nav, timezone utils, vitest | ✅ Done |
| F3 | Integrations — provider configs, API key modal, OAuth connect/disconnect, HealthStatusBar, 12 unit tests | ✅ Done |
| F4 | Automations CRUD — API layer, cron utility, hooks (polling), AutomationCard, AutomationFormModal, RunDetailModal, page, 12 tests | ✅ Done |
| F5 | Content queue — contentApi (7 endpoints), CONTENT_STATUS_CONFIG (6 statuses), getCharCountState (platform char limits), useContent hooks (polls 10s pending / 5s publishing), ContentCard (checkbox select), ReviewModal (inline edit + char counter + auto-save on blur), RejectModal, BulkActionBar (floating, inline reject reason), ContentQueuePage (filter tabs + platform filter + pagination), sidebar amber count badge, 12 unit tests | ✅ Done |
| F6 | Analytics — analyticsApi (6 endpoints + CSV export), dateRange utility (buildDateAxis, fillTimeSeries, formatters), useAnalytics hooks (5min stale, no polling), ChartPrimitives (custom tooltip/colors), KpiCard, RunTrendChart (stacked area), TokenUsageChart (dual-axis), PlatformChart (horizontal bars), AutomationTable (sortable), AnalyticsPage (date range toggle + CSV export), 12 unit tests | ✅ Done |
| F7 | Settings — workspace, billing, team | ⬜ |
| F8 | Admin panel — workspaces, usage, system health | ⬜ |
| F9 | E2E tests (Playwright) + accessibility audit | ⬜ |

---

## Architecture Notes

### Integrations (Sprint F3)

**File layout**

```
src/lib/api/integrations.ts          → 6 typed API functions + Integration type
src/lib/integrations/providers.ts    → PROVIDER_CONFIGS, category helpers
src/hooks/useIntegrations.ts         → 5 TanStack Query hooks
src/components/integrations/
  ProviderIcon.tsx                   → CSS lettermark, sizes sm/md/lg
  IntegrationCard.tsx                → 4-state card (not_connected/active/expiring/error)
  APIKeyModal.tsx                    → RHF + Zod modal, dynamic schema per provider
  HealthStatusBar.tsx                → Topbar pill + click-to-open popover
src/app/(dashboard)/integrations/
  page.tsx                           → 4-category grid page
  callback/page.tsx                  → OAuth callback (Suspense-wrapped)
```

**Hook stability rule** — the `useConnectApiKey` mock (and any hook returning `reset`) must
return **stable function references** (created once in the factory, not per-call). Unstable
refs land in `useEffect` dep arrays and cause infinite render loops.

**Testing pattern** — `vi.mock("@/hooks/useIntegrations", () => { const reset = vi.fn(); return { useConnectApiKey: () => ({ ..., reset }) }; })` — note the stable `reset` declared once in factory scope.

**HealthStatusBar pill states**

| Condition | Dot | Label |
|---|---|---|
| Any `status === "error"` | `bg-red-500` | `N error(s)` |
| Any `status === "expiring"` | `bg-amber-400` (static) | `N expiring` |
| Any `status === "active"` | `bg-emerald-400` (pulse) | `N connected` |
| No integrations | `bg-[#374151]` | `No integrations` |

**Sidebar error badge** — `useIntegrations()` is called in `Sidebar`; when any integration has
`status === "error"`, a 2×2 `bg-red-500` dot is rendered absolutely over the Integrations nav item.

### Automations (Sprint F4)

**File layout**

```
src/lib/api/automations.ts               → 8 API functions + types
src/lib/cron.ts                          → cronToHuman, validateCron, CRON_PRESETS (12)
src/lib/automations/platforms.ts         → PLATFORM_CONFIGS, RUN_STATUS_CONFIG
src/hooks/useAutomations.ts              → automationKeys + 7 hooks
src/components/automations/
  AutomationCard.tsx                     → card with 2s debounced trigger, 3-dot menu
  AutomationFormModal.tsx                → create + edit, cron preset chips, live preview
  RunDetailModal.tsx                     → live-polling run history
src/app/(dashboard)/automations/page.tsx → filter tabs, grid, empty states
src/__tests__/automations/               → 12 unit tests (6 cron + 6 card)
```

**Run status polling** — `useAutomationRuns` sets `refetchInterval` to 3 000 ms while any run is `pending`/`running`; returns `false` once all are terminal. Polling stops on modal unmount.

**Trigger debounce** — 2-second client-side cooldown via `useState + setTimeout`. Prevents double-dispatch; backend rate limits are a second layer.

**Cron display** — `cronToHuman()` converts expressions to labels. Live preview in form. Preset chips fill the cron input; "Custom" chip focuses the input for free entry.

**Hook stability rule (same as F3)** — mock `useToggleAutomation` and `useTriggerAutomation` with stable `mutate` references declared once in factory scope to avoid infinite render loops.

### Content Queue (Sprint F5)

**Approval Flow**
```
pending_review → (human approves) → approved → (Celery publish_worker) → published
pending_review → (human rejects) → rejected
approved → (publish fails) → failed
```

**Polling Strategy**
- `useContent()` refetchInterval:
  - 5s when any item has status `publishing` (active publish in progress)
  - 10s when viewing `pending_review` or `all` (new AI content arrives from Celery)
  - `false` otherwise (stable states: published, rejected, failed)
- Separate low-cost query for pending count (`limit=1`, `total` field used for badge)

**Inline Edit + Auto-Save**
- ReviewModal lets reviewer edit content before approving
- `useEditContent()` PATCH `/api/v1/content/{id}` called on textarea blur (800ms debounce)
- Save state: idle → saving (spinner) → saved (green "Saved" for 2s) → idle
- Char counter uses `getCharCountState()` from `src/lib/content/limits.ts`
- Over-limit: Approve button disabled (can't approve content over platform limit)

**Bulk Actions**
- BulkActionBar floats centered above bottom of viewport (`fixed bottom-6`, centered)
- Bulk reject: inline reason input slides in within the bar (no modal)
- "Select All" in page header selects only `pending_review` items (not all)
- `selectedIds` cleared on tab/filter change and after successful bulk action

**Sidebar Badge**
- Amber number pill (not dot) showing live `pending_review` count
- Shows "99+" when count exceeds 99
- Separate `useContent({ status: 'pending_review', limit: 1 })` query in Sidebar
  — uses `total` from `PaginatedContent`, not `items.length`

**setState-during-render pattern** — used in ReviewModal, RejectModal, and ContentQueuePage
to reset local state when a prop (item id, active tab, platform filter) changes, instead of
calling `setState` inside a `useEffect` body (which triggers the `react-hooks/set-state-in-effect` lint error).

**Key Files Added in F5**
```
src/lib/api/content.ts                   → 7 functions + ContentItem, ContentStatus types
src/lib/content/config.ts                → CONTENT_STATUS_CONFIG, CONTENT_PLATFORM_CONFIG
src/lib/content/limits.ts                → getCharCountState, PLATFORM_CHAR_LIMITS
src/hooks/useContent.ts                  → contentKeys + 7 hooks
src/components/content/
  ContentCard.tsx                        → selectable card, action buttons, internal approve
  ReviewModal.tsx                        → full review with inline edit, onReject callback
  RejectModal.tsx                        → focused reject confirm, manages own state
  BulkActionBar.tsx                      → floating bulk action bar, data-testid="selected-count"
src/app/(dashboard)/content/page.tsx     → queue page with tabs + pagination
src/__tests__/content/                   → 12 unit tests (5 limits + 4 card + 3 bulk)
```

### Analytics (Sprint F6)

**Data Flow**
- All 5 analytics queries keyed by `DateRange` ('7d' | '30d' | '90d')
- `staleTime`: 5 minutes — analytics data doesn't change rapidly
- No `refetchInterval` — switching date range creates new query keys → fresh fetch

**Chart System**
- All charts import shared primitives from `ChartPrimitives.tsx`:
  `ChartTooltip`, `CHART_COLORS`, `xAxisProps`, `yAxisProps`, `gridProps`, `ChartSkeleton`, `ChartEmpty`
- `CHART_COLORS` order: cyan (#06B6D4), amber (#F59E0B), violet, emerald, rose
- Never use raw recharts colors or className-based colors in charts
- `recharts` `ResponsiveContainer` used for all charts (no fixed width)

**Sparse Time Series Handling**
- `fillTimeSeries()` merges backend data with a full date axis, filling gaps with zero-value defaults
- `buildDateAxis()` generates the full axis ending today

**CSV Export**
- `exportAnalyticsCSV()` uses raw `fetch` (not apiClient) to get a blob response
- Creates a temporary `<a>` with `download` attribute, clicks it, revokes the object URL
- Filename format: `"analytics-{range}-{YYYY-MM-DD}.csv"`

**AutomationTable**
- Client-side sort by `total_runs` or `tokens_used` (asc/desc), default `total_runs desc`
- Sort icon rendered as plain function (`sortIcon(col)`) — NOT a component declared inside render
  (avoids `react-hooks/static-components` lint error)
- Capped at 10 rows with "Show all" expansion

**Key Files Added in F6**
```
src/lib/api/analytics.ts                 → 6 functions + all types
src/lib/analytics/dateRange.ts           → buildDateAxis, fillTimeSeries, formatters
src/hooks/useAnalytics.ts                → analyticsKeys + 6 hooks
src/components/analytics/
  ChartPrimitives.tsx                    → shared tooltip, colors, axis props
  KpiCard.tsx                            → KPI with trend indicator
  RunTrendChart.tsx                      → stacked area, successful vs failed
  TokenUsageChart.tsx                    → line chart, dual Y-axis (tokens + cost)
  PlatformChart.tsx                      → horizontal bar, published/pending/failed
  AutomationTable.tsx                    → sortable data table
src/app/(dashboard)/analytics/page.tsx  → full dashboard page
src/__tests__/analytics/                 → 12 unit tests (7 dateRange + 5 KpiCard)
```
