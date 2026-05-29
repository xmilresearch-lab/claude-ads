# AI Automation Platform — Handoff Context

> Last updated: end of Sprint F3. All checks passing. Next task: Sprint F4 (Content Queue).

---

## 1. Project Overview

A multi-tenant AI automation platform. Users connect social/email/CRM accounts and configure
automations that run on schedules or webhooks. Claude handles all AI generation; MCP servers
abstract the integrations.

**Backend is 100% complete** (10 sprints). The codebase at `/backend` is production-ready with
Docker, CI/CD, tests, and deployment docs. Do not modify the backend unless explicitly asked.

**Frontend is in active development.** Sprints F1, F2, and F3 are done. Sprint F4 is next.

**Aesthetic:** "Industrial Command Center" — dark, precise, amber-accented. Think a control room
dashboard, not a consumer app. Never use white backgrounds, rounded-xl cards, purple gradients,
or Inter font.

**Repo:** `xmilresearch-lab/claude-ads`
**Branch:** `claude/claude-md-documentation-TJtEy`
**Working directory:** `/home/user/claude-ads/frontend`

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 16.2.6** App Router | Installed as 16, not 15 — breaking changes apply |
| Language | TypeScript 5 strict | `"strict": true` |
| Styling | **Tailwind CSS v3** | Pinned to v3. v4 breaks `tailwind.config.ts` pattern |
| UI Primitives | Radix UI (hand-written wrappers) | No shadcn CLI — all components written manually |
| Data Fetching | TanStack Query v5 | staleTime 30s default, 5min for workspace |
| Forms | React Hook Form + Zod | All forms use `zodResolver` |
| Auth State | In-memory access token + js-cookie refresh | Never localStorage |
| Notifications | Sonner | `toast.success/error/info` |
| Charts | Recharts | Available but not yet used |
| Dates | date-fns v4 | |
| Icons | Lucide React | |
| Testing | Vitest + @testing-library/react + jsdom | `npm test` |
| Route protection | `src/proxy.ts` | Next.js 16 renamed `middleware.ts` → `proxy.ts`, exports `proxy` |

---

## 3. Project Structure

```
/home/user/claude-ads/
├── backend/                        ← COMPLETE. Do not modify.
├── docs/                           ← API.md, DEPLOYMENT.md, DEVELOPMENT.md
├── CLAUDE.md                       ← Backend coding standards + sprint map
├── CONTEXT.md                      ← This file
└── frontend/
    ├── package.json
    ├── tailwind.config.ts          ← ALL design tokens defined here
    ├── vitest.config.ts            ← jsdom + @vitejs/plugin-react + @/* alias
    ├── tsconfig.json
    └── src/
        ├── proxy.ts                ← Route protection (Next.js 16 middleware)
        ├── app/
        │   ├── layout.tsx          ← Root: QueryProvider + AuthProvider + Toaster
        │   ├── globals.css         ← Tailwind + CSS vars + .card-command, .nav-item, .status-live, .input-command
        │   ├── page.tsx            ← redirect("/automations")
        │   ├── (auth)/
        │   │   ├── layout.tsx      ← Two-panel brand layout (left: amber hero, right: form)
        │   │   ├── login/page.tsx  ← Suspense wrapper (needed for useSearchParams)
        │   │   └── register/page.tsx
        │   ├── (dashboard)/
        │   │   ├── layout.tsx      ← Sidebar + Topbar + OnboardingBanner
        │   │   ├── automations/page.tsx  ← ✅ F3 — stats strip, skeleton, grid, CreateAutomationDialog
        │   │   ├── content/page.tsx      ← PLACEHOLDER — Sprint F4 target
        │   │   ├── integrations/page.tsx ← placeholder
        │   │   ├── analytics/page.tsx    ← placeholder
        │   │   ├── audit/page.tsx        ← placeholder
        │   │   └── settings/
        │   │       ├── layout.tsx        ← pass-through
        │   │       ├── page.tsx          ← redirect("/settings/workspace")
        │   │       ├── workspace/page.tsx     ← name (auto-save on blur) + preferences form
        │   │       ├── brand-voice/page.tsx   ← form + live preview (useWatch)
        │   │       ├── onboarding/page.tsx    ← 3-step checklist → /automations on complete
        │   │       ├── account/page.tsx       ← profile + change-password (stub)
        │   │       └── danger/page.tsx        ← delete workspace dialog (stub)
        │   └── (admin)/
        │       ├── layout.tsx          ← Client component; isAdmin guard
        │       └── admin/
        │           ├── page.tsx
        │           ├── users/page.tsx
        │           ├── workspaces/page.tsx
        │           ├── usage/page.tsx
        │           └── system/page.tsx
        ├── components/
        │   ├── ui/                     ← All primitives, hand-written
        │   │   ├── button.tsx          ← CVA variants: default/secondary/ghost/destructive/outline/link
        │   │   ├── badge.tsx           ← CVA variants: default/success/danger/warning/info/secondary/outline
        │   │   ├── input.tsx           ← font-mono, amber focus border
        │   │   ├── label.tsx
        │   │   ├── card.tsx
        │   │   ├── dialog.tsx          ← Radix Dialog, dark bg-bg-elevated
        │   │   ├── dropdown-menu.tsx
        │   │   ├── tabs.tsx            ← amber active state (border-b-2 border-amber)
        │   │   ├── progress.tsx
        │   │   ├── separator.tsx
        │   │   ├── skeleton.tsx
        │   │   └── avatar.tsx
        │   ├── layout/
        │   │   ├── sidebar.tsx         ← w-60, collapsible settings sub-nav, pending content badge
        │   │   ├── topbar.tsx          ← BrandVoiceBanner fragment, SystemStatus, user dropdown
        │   │   ├── page-header.tsx     ← title, subtitle/description, actions/action, breadcrumb
        │   │   ├── onboarding-banner.tsx ← fixed bottom-4 left-[256px], amber progress bar
        │   │   └── admin-sidebar.tsx
        │   ├── auth/
        │   │   ├── login-form.tsx      ← ?from= redirect via useSearchParams
        │   │   └── register-form.tsx   ← PasswordStrength (4 amber segments)
        │   ├── automations/            ← ✅ F3 — all three files complete
        │   │   ├── automation-card.tsx         ← toggle, inline delete, lazy run history
        │   │   └── create-automation-dialog.tsx ← reusable create/edit via `initial?` prop
        │   ├── content/                ← 🔄 F4 — needs: content-card.tsx, calendar-view.tsx, approve-dialog.tsx
        │   └── shared/
        │       ├── data-table.tsx
        │       ├── empty-state.tsx
        │       ├── loading-skeleton.tsx
        │       ├── stat-card.tsx
        │       └── status-badge.tsx
        ├── lib/
        │   ├── api/
        │   │   ├── client.ts           ← ApiError, auto-refresh on 401, X-Request-ID, unwraps {data}
        │   │   ├── types.ts            ← All TypeScript interfaces matching backend OpenAPI
        │   │   └── endpoints/
        │   │       ├── auth.ts         ← authApi + login/register/logout/getMe functions
        │   │       ├── workspaces.ts   ← workspacesApi (getMe/updateMe/brand-voice/settings)
        │   │       ├── automations.ts  ← listAutomations/getAutomation/createAutomation/updateAutomation/deleteAutomation/triggerAutomation/listRuns
        │   │       ├── content.ts      ← listContent, approveContent, rejectContent  ← EXISTS, ready for F4
        │   │       ├── integrations.ts
        │   │       ├── analytics.ts
        │   │       ├── audit.ts
        │   │       └── admin.ts
        │   ├── auth/
        │   │   └── tokens.ts           ← _accessToken (memory), cookie refresh, refreshAccessToken(), _refreshPromise dedup
        │   ├── hooks/
        │   │   ├── use-auth.ts         ← re-exports from auth-provider
        │   │   ├── use-workspace.ts    ← useWorkspace, useBrandVoice, useUpdateWorkspace, useSetBrandVoice, useDeleteBrandVoice, useUpdateSettings
        │   │   ├── use-onboarding.ts   ← useOnboardingStatus, useOnboardingRedirect
        │   │   ├── use-automations.ts  ← ✅ F3 — 7 hooks, 3 query key exports
        │   │   └── use-debounce.ts
        │   ├── providers/
        │   │   ├── auth-provider.tsx   ← AuthContext: user, isLoading, isAuthenticated, isAdmin, login, register, logout
        │   │   └── query-provider.tsx
        │   └── utils/
        │       ├── cn.ts               ← clsx + tailwind-merge
        │       ├── format.ts           ← format.{number,compact,percent,tokens,usd,date,time,datetime,relative,truncate,initials,planLabel}
        │       ├── constants.ts        ← API_URL, BACKEND_URL, APP_NAME, TOKEN_COOKIE
        │       └── timezones.ts        ← TIMEZONES (31 IANA), TIMEZONE_GROUPS
        └── tests/
            ├── setup.ts               ← @testing-library/jest-dom
            ├── format.test.ts         ← 14 tests
            └── use-onboarding.test.ts ← 7 tests (timezones)
```

---

## 4. Work Completed

### Sprint F1 ✅ — Scaffold + Auth + Layout

- Next.js 16 project scaffold with Tailwind v3, custom design tokens, Google Fonts (Syne, DM Sans, DM Mono)
- `tailwind.config.ts` with full token set: amber, cyan, bg-*, text-*, border-*, shadow-amber/cyan/card, animations
- `globals.css`: `.card-command`, `.nav-item`, `.nav-item.active`, `.status-live`, `.input-command` component classes
- `src/proxy.ts` route protection: public paths exact-match, redirect unauthed → `/login?from=`, redirect authed on public → `/automations`
- `app/page.tsx` → `redirect("/automations")`
- Route groups: `(auth)`, `(dashboard)`, `(admin)/admin/` subfolder
- Auth: `tokens.ts` (in-memory access token, cookie refresh, `_refreshPromise` dedup), `auth-provider.tsx` (AuthContext), `api/client.ts` (ApiError, auto-401-refresh, X-Request-ID, `{data}` envelope unwrap)
- Auth pages: two-panel layout (amber hero left, form right), `LoginForm` (`?from=` redirect), `RegisterForm` (PasswordStrength 4-segment component)
- Dashboard layout: `Sidebar` + `Topbar` + `OnboardingBanner`
- `Sidebar`: w-60, Zap/CheckSquare2/Plug/BarChart3/Shield/Settings icons, pending content badge via useQuery, WORKSPACE label, collapsible settings sub-nav (Workspace/Brand Voice/Account/Danger Zone)
- `Topbar`: workspace breadcrumb, `SystemStatus` (polls `/health/ready` every 60s), user dropdown with profile/settings/sign-out links, `BrandVoiceBanner` fragment below header
- Admin: `(admin)/layout.tsx` client component with `isAdmin` guard, `AdminSidebar` with amber top border, 5 placeholder admin pages
- Shared components: `DataTable`, `EmptyState`, `LoadingSkeletons`, `StatCard`, `StatusBadge`
- UI primitives (all hand-written, Radix-based): Button (CVA), Badge (CVA), Input, Label, Card, Dialog, DropdownMenu, Tabs, Progress, Separator, Skeleton, Avatar
- `format.ts` utility with number/date/string formatters
- All API endpoint files created: auth, workspaces, automations, content, integrations, analytics, audit, admin

### Sprint F2 ✅ — Settings + Workspace + Onboarding

**Sections 1–3 (API layer):**
- `lib/api/types.ts`: added `BrandVoice`, `WorkspaceSettings`, updated `WorkspaceResponse`
- `lib/api/endpoints/workspaces.ts`: `workspacesApi` with getMe/updateMe/getBrandVoice/setBrandVoice/deleteBrandVoice/getSettings/updateSettings
- `lib/hooks/use-workspace.ts`: 6 hooks; `WORKSPACE_KEY = ["workspace", "me"]`
- `lib/hooks/use-onboarding.ts`: `useOnboardingStatus` (3 steps: workspaceNamed/brandVoiceSet/integrationAdded), `useOnboardingRedirect` (one-shot sessionStorage redirect)

**Sections 4–10 (Settings pages):**
- `settings/layout.tsx`: pass-through
- `settings/page.tsx`: `redirect("/settings/workspace")`
- `settings/workspace/page.tsx`: WorkspaceNameCard (auto-save on blur, inline "Saving…", Check icon 2s on success, amber dirty border) + PreferencesCard (timezone grouped select, approval CSS toggle, Save button)
- `settings/brand-voice/page.tsx`: form + **LivePreview** panel (useWatch, real-time 2-col grid; amber tone, red avoid-tags, blockquote example)
- `settings/onboarding/page.tsx`: 3-step checklist; **redirects to `/automations` after 1.5s when `isComplete === true`**
- `settings/account/page.tsx`: read-only profile (email in amber mono, plan badge — admin = amber pill), PasswordStrength (4-segment), change-password stub toast
- `settings/danger/page.tsx`: `border-danger/30 bg-danger/5` card, delete dialog with **exact case-sensitive name match** required, stub toast

**Sections 11–17 (Layout + Utilities + Tests):**
- `PageHeader` component: `subtitle`/`description` aliases, `actions`/`action` aliases, `breadcrumb?: { label, href? }[]`
- `BrandVoiceBanner` in Topbar: amber strip, shows when `workspace.brand_voice === null` AND registered >5 min AND not sessionStorage-dismissed (`"bv_banner_dismissed"`)
- `OnboardingBanner`: fixed `bottom-4 left-[256px] right-4 z-50`, amber progress bar, `{n}/3 steps complete`, sessionStorage `"onboarding_dismissed"`, hidden on `/settings/*` and `isComplete`
- Sidebar settings sub-nav: Workspace/Brand Voice/Account/Danger Zone, 150ms CSS `maxHeight` transition, chevron rotates 90° when expanded
- `lib/utils/timezones.ts`: 31 IANA timezones, 4 groups, `TIMEZONE_GROUPS` const
- Vitest setup: `vitest.config.ts` (jsdom + React plugin + `@/*` alias), 21 passing tests

### Sprint F3 ✅ — Automations CRUD

- **`lib/hooks/use-automations.ts`** — 7 hooks with optimistic cache updates and toast feedback:
  - `useAutomations()` — `queryKey: AUTOMATIONS_KEY = ["automations"]`, staleTime 30s, limit 100
  - `useCreateAutomation()` — prepends to cache list on success
  - `useUpdateAutomation({ id, payload })` — updates list + single key on success
  - `useDeleteAutomation(id)` — filters from cache list on success
  - `useToggleAutomation({ id, active })` — calls `updateAutomation(id, { active })`, updates cache
  - `useTriggerAutomation(id)` — toast "Run triggered" on success
  - `useRunHistory(id, enabled=false)` — lazy (only fetches when `enabled=true`), staleTime 15s, `queryKey: ["automations", id, "runs"]`

- **`components/automations/automation-card.tsx`** — full card component:
  - `ActiveToggle`: CSS toggle button (h-5 w-9 rounded-full, amber when active), calls `useToggleAutomation`
  - `RunRow`: status badge, `format.datetime()`, token count via `format.tokens()`, duration in seconds, error text (truncated, danger color)
  - `AutomationCard` states: `editOpen`, `confirmDelete`, `showRuns`
  - Inline two-step delete: first click shows "Delete? [Cancel] [Delete]" — no modal
  - Lazy run history: `useRunHistory(id, showRuns)` — skeleton pulse while loading, "No runs yet" when empty
  - `TYPE_LABELS`, `TYPE_VARIANT` (info/default/secondary/warning per type)
  - `RUN_STATUS_VARIANT`: success→success, failed/blocked→danger, running→info, pending→warning

- **`components/automations/create-automation-dialog.tsx`** — reusable create/edit dialog:
  - Props: `open`, `onOpenChange`, `initial?: AutomationResponse`
  - `isEdit = !!initial` — controls title, description, submit label, which mutation to call
  - Radio card type selector (amber border/bg when selected), hint text per type
  - Cron examples shown as `text-2xs font-mono text-text-muted`
  - `reset()` called on every open with initial or empty defaults
  - Zod schema: name min(1) max(120), type enum 5 values, schedule optional string

- **`app/(dashboard)/automations/page.tsx`** — replaced placeholder, full client page:
  - `"use client"` — TanStack Query hooks require client context
  - `SkeletonCard` pulse animation sub-component
  - Stats strip: total / active (amber) / paused in `font-mono text-lg`
  - Three render states: loading (3 skeleton cards), empty (EmptyState + Zap icon + CTA), data (responsive grid)
  - Responsive grid: `grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3`

---

## 5. Decisions Made

| Decision | Rationale |
|---|---|
| Next.js 16 (not 15) | `create-next-app` installed 16.2.6. Key difference: `middleware.ts` → `proxy.ts`, exports `proxy` not `middleware` |
| Tailwind v3 (not v4) | v4 uses CSS-based config; breaks `tailwind.config.ts` pattern. Pinned to `^3.4.19` |
| No shadcn CLI | Not available in environment; all Radix wrappers hand-written |
| Access token in memory | Security requirement — never localStorage. Cookie for refresh token only |
| Raw `fetch` in `refreshAccessToken()` | Avoids circular dep: `client.ts` imports `tokens.ts`, which would import `client.ts` |
| `_refreshPromise` dedup | Single in-flight refresh; parallel 401s reuse the same promise |
| `isAdmin: user?.plan === "admin"` | Client-side guard only; sufficient for dashboard routing |
| `(admin)/admin/` subfolder | Avoids route conflict between `(admin)/page.tsx` and `(dashboard)/page.tsx` |
| sessionStorage for one-shot banners | Survives navigation within session, resets on next session — correct UX for nudge banners |
| Workspace name auto-save on blur | Reduces friction; single-field form doesn't need an explicit Save button |
| Brand voice preview via `useWatch` | Real-time feedback without needing to submit — shows AI personality as user types |
| `/settings/onboarding` redirect after 1.5s | Shows "Setup complete!" text for 1.5s, then pushes to `/automations` — feels intentional not jarring |
| `SETTINGS_SUB_NAV` separate from `NAV_ITEMS` | Sub-nav expands via CSS `maxHeight` transition without re-rendering the whole nav |
| Inline delete confirm (no modal) | Reduces component complexity in the card; two-step state toggle is sufficient for a destructive action |
| Lazy `useRunHistory(id, enabled)` | Avoids N parallel requests on page load — only fetches when user expands the history section |
| `CreateAutomationDialog` with `initial?` prop | Single component handles both create and edit; `isEdit = !!initial` drives all conditional behavior |
| `"use client"` on automations page | TanStack Query hooks require client context; no SSR metadata needed on this page |

---

## 6. Current State

### What's working
- Full auth flow: register → login → token refresh → logout
- Route protection via `proxy.ts`
- All settings pages: workspace, brand-voice (with live preview), onboarding (redirects on completion), account, danger zone
- Dashboard layout: sidebar with collapsible settings nav, topbar with system status and brand voice banner, floating onboarding banner
- **Automations CRUD**: list with stats strip, create/edit dialog, active toggle, inline delete confirm, expandable run history
- Admin panel shell (all pages are placeholders pending Sprint F7)

### What's incomplete / placeholder
- `/content` — placeholder, **Sprint F4 target**
- `/integrations` — placeholder
- `/analytics` — placeholder
- `/audit` — placeholder
- All 5 admin pages — "Coming in Sprint F7" placeholders
- `settings/account` change-password — stub toast (backend endpoint not yet built)
- `settings/danger` delete workspace — stub toast (backend endpoint not yet built)

### Build status
```
npm run typecheck  → 0 errors
npm run test       → 21/21 passing
npm run build      → 22 routes, 0 warnings
Last commit        → 9e8ac93 feat(frontend): Sprint F3 — Automations CRUD
```

---

## 7. Active Files for Sprint F4

The backend content API is fully built. These frontend files are needed:

| File | Status | Notes |
|---|---|---|
| `src/lib/api/endpoints/content.ts` | ✅ EXISTS | `listContent`, `approveContent`, `rejectContent` already implemented |
| `src/lib/api/types.ts` | ✅ EXISTS | `ContentQueueItem` and `ContentStatus` types already defined |
| `src/lib/hooks/use-content.ts` | ❌ Missing | **Create this first** |
| `src/components/content/content-card.tsx` | ❌ Missing | Approval card component |
| `src/components/content/calendar-view.tsx` | ❌ Missing | Month grid calendar |
| `src/components/content/approve-dialog.tsx` | ❌ Missing | Full preview + approve dialog |
| `src/app/(dashboard)/content/page.tsx` | 🔄 Stub | Replace placeholder |

---

## 8. Exact Next Step — Sprint F4: Content Queue

The content API endpoints already exist at `src/lib/api/endpoints/content.ts`. This sprint is
pure frontend work: build the approval queue UI.

### Section 1 — Hook (`src/lib/hooks/use-content.ts`)

```typescript
export const CONTENT_KEY = ["content"] as const;
export const contentKey = (id: string) => ["content", id] as const;

// useContentQueue({ status?, limit? }) — staleTime 20s
// useApproveContent() — optimistic: set status to "approved" in list cache
// useRejectContent() — optimistic: set status to "rejected" in list cache
// useContentStats() — derived from list query: { pending, approved, rejected, total }
```

### Section 2 — Content Card (`src/components/content/content-card.tsx`)

- Show: automation name (from embedded field or `automation_id`), status badge, AI-generated content preview (3-line clamp), `created_at`, token count via `format.tokens()`
- Status badge variants: `pending` → warning, `approved` → success, `rejected` → danger, `publishing` → info
- "Approve" (green ghost) and "Reject" (danger ghost) action buttons — only shown when `status === "pending"`
- Amber left border (`border-l-2 border-amber`) when `status === "pending"`
- Click anywhere on preview text → open `ApproveDialog` for full preview

### Section 3 — Approve Dialog (`src/components/content/approve-dialog.tsx`)

- Full content preview (no truncation, `font-mono text-xs`)
- Optional edit textarea for minor tweaks before approval
- "Approve" button (amber, primary) and "Reject" button (danger ghost) in footer
- Shows automation name + scheduled_at in header

### Section 4 — Calendar View (`src/components/content/calendar-view.tsx`)

- Month grid layout (7-col, Mon–Sun header)
- Content items grouped by `scheduled_at` date — show up to 3 per cell, then "+N more"
- Click a date cell to filter the queue to that date
- Mini dot indicators per date: amber = has pending, green = all approved
- Prev/next month navigation with `<` `>` buttons

### Section 5 — Content Queue Page (`src/app/(dashboard)/content/page.tsx`)

```
"use client"

PageHeader: "Content Queue" | description | action: toggle Queue/Calendar view

Stats strip (when !loading && total > 0):
  Total | Pending (amber) | Approved (green) | Rejected (danger)

View toggle: "Queue" | "Calendar" — state or ?view= searchParam, amber underline on active

Filter tabs: All | Pending | Approved | Rejected — amber underline on active tab

Loading: 3 skeleton cards (same pulse pattern as automations page)

Empty: EmptyState with FileText icon, "No content yet"

Queue view: grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3
Calendar view: <CalendarView items={content} />
```

### Section 6 — Sidebar update (`src/components/layout/sidebar.tsx`)

Add "Content" to `NAV_ITEMS` array **between Automations and Settings**:
```typescript
{ href: "/content", label: "Content", icon: FileText }
```

The pending content count badge already exists on the sidebar — wire it to the `useContentQueue` result filtered to `status === "pending"`.

---

## 9. Known Issues / Watch Out For

### Critical gotchas

**Next.js 16 `proxy.ts`** — The route protection file is `src/proxy.ts`, NOT `src/middleware.ts`. It exports `function proxy(...)`, not `function middleware(...)`. If you create a `middleware.ts` file, it will conflict.

**Tailwind v4 incompatibility** — Pinned to v3 (`^3.4.19`). Do NOT run `npm install tailwindcss@latest`.

**No shadcn CLI** — All UI components are hand-written in `src/components/ui/`. Do not try to run `npx shadcn-ui add`.

**`useSearchParams()` requires Suspense** — Any client component using `useSearchParams()` must be wrapped in `<Suspense>` by its parent page.

**`ApiError` is flat** — `{ code, message, status, field? }`. NOT a nested `errors[]` array.

**Admin route group subfolder** — Admin pages live at `(admin)/admin/PAGE/page.tsx` to avoid URL collision. The URL is `/admin/users` etc.

**`automations/page.tsx` is `"use client"`** — If you ever need page-level metadata (OG tags), extract a thin server wrapper and keep the client logic in a child. Same pattern applies to `content/page.tsx`.

**Bash parentheses in git** — Always quote paths with `(dashboard)` etc:
```bash
git add "frontend/src/app/(dashboard)/content/page.tsx"
```

**Settings sub-nav** — Content nav item goes in `NAV_ITEMS` (renders in main nav). Do NOT add it to `SETTINGS_SUB_NAV` (that array is only for the collapsible settings section).

### Settings page stubs

`settings/account/page.tsx` — change-password form submits with stub toast. When the backend adds `/auth/change-password`, wire it up in `src/lib/api/endpoints/auth.ts` and update the page.

`settings/danger/page.tsx` — delete workspace shows stub toast. Same situation for `/auth/delete-account`.

### SessionStorage keys (all one-shot, reset on new session)

| Key | Component | Behavior |
|---|---|---|
| `"bv_banner_dismissed"` | `BrandVoiceBanner` in Topbar | Hides amber brand voice nudge strip |
| `"onboarding_dismissed"` | `OnboardingBanner` | Hides floating bottom banner |
| `"onboarding_redirected"` | `useOnboardingRedirect` | Prevents re-redirecting to /settings/onboarding on every page load |

### Design rules (never break)

- **Amber `#F59E0B`** ONLY for: active nav, primary CTA, live status dot, focus rings.
- **Cyan `#06B6D4`** ONLY for: data values, chart lines, system metrics.
- **Never** use `rounded-xl` — max is `rounded-lg` (8px).
- **Never** white or light backgrounds. Minimum dark is `bg-bg-surface (#0D0E14)`.
- **Never** Inter font. Syne for headings, DM Sans for body, DM Mono for code/IDs/metrics.
- All IDs, tokens, numeric metrics **must** use `font-mono`.
- All API calls **must** go through `src/lib/api/client.ts`. Never `fetch()` in components.
- Access token **never** in localStorage or sessionStorage — only in memory (`_accessToken`).

### Security constraints (permanent, carry forward every sprint)

- ALL user-supplied content → `injection_scanner` before reaching Claude
- ALL Claude-generated content → `dlp_scanner` before external APIs
- OAuth tokens + API keys → AES-256-GCM encrypted, never logged
- Every Claude API call includes workspace brand voice in system prompt; examples sanitized via `sanitize_example()` before injection (LLM04)
- Every automation run writes a record to `automation_runs` (status, result, duration)
- No credentials in code — always env vars
- Never log sensitive fields (tokens, passwords, PII)
- Never store credentials in plain text — encrypt before DB write
- MCP servers are stateless — all state lives in PostgreSQL
- Run `pip-audit` before every release; HIGH/CRITICAL findings block deployment

---

## 10. Commands to Know

```bash
# Navigate to frontend
cd /home/user/claude-ads/frontend

# Dev server
npm run dev

# TypeScript check (must be 0 errors before any commit)
npm run typecheck

# Build (must be clean before any commit)
npm run build

# Run tests
npm test

# Watch mode for tests
npm run test:watch

# Lint
npm run lint
```

### Git

```bash
# Current branch
git status   # should be on claude/claude-md-documentation-TJtEy

# Push (always quote paths with parens)
git add "frontend/src/app/(dashboard)/content/page.tsx"
git push -u origin claude/claude-md-documentation-TJtEy

# Recent commits
git log --oneline -10
```

### Environment variables

Create `frontend/.env.local` with:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=Automate
```

---

## Appendix: Key Type Interfaces

```typescript
// src/lib/api/types.ts (key interfaces only)

interface UserResponse {
  id: string; email: string; plan: string;
  is_active: boolean; created_at: string;
}

interface BrandVoice {
  tone: string; avoid: string[]; examples: string[];
  industry: string; target_audience: string;
}

interface WorkspaceSettings {
  require_approval_default: boolean; default_timezone: string;
  notification_email: string | null; content_language: string;
}

interface WorkspaceResponse {
  id: string; name: string;
  brand_voice: BrandVoice | null;
  settings: WorkspaceSettings | null;
  created_at: string;
  integrations_count: number;
  automations_count: number;
  active_automations_count: number;
}

type AutomationType = "social_post" | "email_campaign" | "support_reply" | "crm_update" | "scheduled";

interface AutomationResponse {
  id: string; workspace_id: string; name: string;
  type: AutomationType; config: Record<string, unknown>;
  schedule: string | null; active: boolean;
  created_at: string; updated_at: string;
}

type RunStatus = "pending" | "running" | "success" | "failed" | "blocked";

interface AutomationRunResponse {
  id: string; automation_id: string; status: RunStatus;
  result: Record<string, unknown> | null; error: string | null;
  ai_tokens_used: number | null;
  started_at: string; finished_at: string | null;
}

// Content Queue (already defined — use these for F4)
type ContentStatus = "pending" | "approved" | "rejected" | "publishing" | "published" | "failed";

interface ContentQueueItem {
  id: string; automation_id: string; automation_name?: string;
  content: Record<string, unknown>; platform: string;
  status: ContentStatus;
  scheduled_at: string | null; published_at: string | null;
  created_at: string;
}
```

## Appendix: TanStack Query Keys

```typescript
WORKSPACE_KEY    = ["workspace", "me"]
BRAND_VOICE_KEY  = ["workspace", "brand-voice"]
SETTINGS_KEY     = ["workspace", "settings"]
AUTOMATIONS_KEY  = ["automations"]
automationKey    = (id: string) => ["automations", id]
runsKey          = (id: string) => ["automations", id, "runs"]
CONTENT_KEY      = ["content"]           // ← define in use-content.ts
contentKey       = (id: string) => ["content", id]
```

## Appendix: CSS Component Classes (globals.css)

```css
.card-command   /* bg-bg-surface border border-border shadow-card rounded */
.nav-item       /* sidebar navigation item */
.nav-item.active /* amber left border + amber text */
.status-live    /* 2×2 amber pulsing dot */
.input-command  /* bg-bg-surface mono font, amber focus */
```

## Appendix: Sprint Map

| Sprint | Focus | Status |
|---|---|---|
| F1 | Next.js scaffold, design system, auth, layout, dashboard shell | ✅ Done |
| F2 | Workspace setup, brand voice, onboarding, settings nav, timezone utils, vitest | ✅ Done |
| F3 | Automations CRUD — list, create, edit, delete, toggle, run history | ✅ Done |
| F4 | Content queue — approval workflow, calendar view | 🔄 **Active — start here** |
| F5 | Integrations — OAuth connect/disconnect flows | ⬜ |
| F6 | Analytics dashboard — charts, usage stats | ⬜ |
| F7 | Settings — billing, team (admin panel activated) | ⬜ |
| F8 | Admin panel — workspaces, usage, system health | ⬜ |
| F9 | E2E tests (Playwright) + accessibility audit | ⬜ |
