# AI Automation Platform — Handoff Context

> Last updated: end of Sprint F2. All checks passing. Next task: Sprint F3 (Automations CRUD).

---

## 1. Project Overview

A multi-tenant AI automation platform. Users connect social/email/CRM accounts and configure
automations that run on schedules or webhooks. Claude handles all AI generation; MCP servers
abstract the integrations.

**Backend is 100% complete** (10 sprints). The codebase at `/backend` is production-ready with
Docker, CI/CD, tests, and deployment docs. Do not modify the backend unless explicitly asked.

**Frontend is in active development.** Sprints F1 and F2 are done. Sprint F3 is next.

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
        │   │   ├── automations/page.tsx  ← PLACEHOLDER — Sprint F3 target
        │   │   ├── content/page.tsx      ← placeholder
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
        │   │       ├── content.ts      ← listContent, approveContent, rejectContent
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
- `lib/api/types.ts`: added `BrandVoice`, `WorkspaceSettings`, updated `WorkspaceResponse` (added `integrations_count`, `automations_count`, `active_automations_count`)
- `lib/api/endpoints/workspaces.ts`: `workspacesApi` with getMe/updateMe/getBrandVoice/setBrandVoice/deleteBrandVoice/getSettings/updateSettings
- `lib/hooks/use-workspace.ts`: 6 hooks (useWorkspace, useBrandVoice, useUpdateWorkspace, useSetBrandVoice, useDeleteBrandVoice, useUpdateSettings); `WORKSPACE_KEY = ["workspace", "me"]`
- `lib/hooks/use-onboarding.ts`: `useOnboardingStatus` (3 steps: workspaceNamed/brandVoiceSet/integrationAdded), `useOnboardingRedirect` (one-shot sessionStorage redirect)

**Sections 4–10 (Settings pages):**
- `settings/layout.tsx`: pass-through
- `settings/page.tsx`: `redirect("/settings/workspace")`
- `settings/workspace/page.tsx`: WorkspaceNameCard (auto-save on blur, "Saving…" inline, Check icon 2s on success, amber dirty border) + PreferencesCard (timezone grouped select, approval CSS toggle, language, notification email, Save button)
- `settings/brand-voice/page.tsx`: create/edit/delete form + **LivePreview** panel (useWatch, real-time 2-col grid; amber tone, red avoid-tags, blockquote example); Zap nudge when no brand voice
- `settings/onboarding/page.tsx`: 3-step checklist with progress bar; **redirects to `/automations` after 1.5s when `isComplete === true`**
- `settings/account/page.tsx`: read-only profile (email in amber mono, plan badge — admin = amber pill), PasswordStrength (4-segment), change-password stub toast
- `settings/danger/page.tsx`: `border-danger/30 bg-danger/5` card, delete dialog with **exact case-sensitive name match** required, stub toast

**Sections 11–17 (Layout + Utilities + Tests):**
- `PageHeader` component: `subtitle`/`description` aliases, `actions`/`action` aliases, `breadcrumb?: { label, href? }[]`
- `BrandVoiceBanner` in Topbar: amber strip, shows when `workspace.brand_voice === null` AND registered >5 min AND not sessionStorage-dismissed (`"bv_banner_dismissed"`)
- `OnboardingBanner`: fixed `bottom-4 left-[256px] right-4 z-50`, amber progress bar, `{n}/3 steps complete`, sessionStorage `"onboarding_dismissed"`, hidden on `/settings/*` and `isComplete`
- Dashboard layout updated to include `<OnboardingBanner />`
- Sidebar settings sub-nav: Workspace/Brand Voice/Account/Danger Zone, 150ms CSS `maxHeight` transition, chevron rotates 90° when expanded
- `lib/utils/timezones.ts`: 31 IANA timezones, 4 groups (UTC/Americas/Europe/Asia/Pacific), `TIMEZONE_GROUPS` const
- Vitest setup: `vitest.config.ts` (jsdom + React plugin + `@/*` alias), 21 passing tests
- `frontend/CLAUDE.md` updated: F2 ✅ Done, F3 🔄 Active, common mistakes updated

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
| `(admin)/admin/` subfolder | Avoids route conflict between `(admin)/page.tsx` and `(dashboard)/page.tsx` both resolving to `/` |
| sessionStorage for one-shot banners | Survives navigation within session, resets on next session — correct UX for nudge banners |
| Workspace name auto-save on blur | Reduces friction; single-field form doesn't need an explicit Save button |
| Brand voice preview via `useWatch` | Real-time feedback without needing to submit — shows AI personality as user types |
| comma-separated string for avoid/examples | Simpler UX than tag input; `toArray()`/`fromArray()` converts at save/load boundary |
| `/settings/onboarding` redirect after 1.5s | Shows "Setup complete!" text for 1.5s, then pushes to `/automations` — feels intentional not jarring |
| `SETTINGS_SUB_NAV` separate from `NAV_ITEMS` | Sub-nav expands via CSS `maxHeight` transition without re-rendering the whole nav |

---

## 6. Current State

### What's working
- Full auth flow: register → login → token refresh → logout
- Route protection via `proxy.ts`
- All settings pages: workspace, brand-voice (with live preview), onboarding (redirects on completion), account, danger zone
- Dashboard layout: sidebar with collapsible settings nav, topbar with system status and brand voice banner, floating onboarding banner
- Admin panel shell (all pages are placeholders pending Sprint F7)
- 22 routes build cleanly, 0 TypeScript errors, 21 unit tests passing

### What's incomplete / placeholder
- `/automations` — placeholder card, **Sprint F3 target**
- `/content` — placeholder
- `/integrations` — placeholder
- `/analytics` — placeholder
- `/audit` — placeholder
- All 5 admin pages — "Coming in Sprint F7" placeholders
- `settings/account` change-password — stub toast (backend endpoint `/auth/change-password` not yet built)
- `settings/danger` delete workspace — stub toast (backend endpoint `/auth/delete-account` not yet built)

### Build status
```
npm run typecheck  → 0 errors
npm run test       → 21/21 passing
npm run build      → 22 routes, 0 warnings
```

---

## 7. Active Files

All Sprint F2 files are complete and committed. No files are in a partial/broken state.

The next files to create are for Sprint F3 (Automations CRUD):
- `src/app/(dashboard)/automations/page.tsx` — replace placeholder
- Likely: `src/components/automations/automation-card.tsx`
- Likely: `src/components/automations/create-automation-dialog.tsx`
- Likely: `src/lib/hooks/use-automations.ts`

---

## 8. Exact Next Step

**Sprint F3: Automations CRUD**

The API endpoint file is already written at `src/lib/api/endpoints/automations.ts` and exports:
- `listAutomations(params: { limit?, offset? })`
- `getAutomation(id: string)`
- `createAutomation(payload: { name, type, config?, schedule? })`
- `updateAutomation(id, payload: { name?, type?, config?, schedule?, active? })`
- `deleteAutomation(id)`
- `triggerAutomation(id, payload?)`
- `listRuns(id, params)`

Types in `src/lib/api/types.ts`:
```typescript
type AutomationType = "social_post" | "email_campaign" | "support_reply" | "crm_update" | "scheduled"
type AutomationStatus = "active" | "paused" | "error"
interface AutomationResponse {
  id: string; workspace_id: string; name: string;
  type: AutomationType; config: Record<string, unknown>;
  schedule: string | null; active: boolean;
  created_at: string; updated_at: string;
}
```

Sprint F3 should deliver:
1. `use-automations.ts` hook (useAutomations, useCreateAutomation, useUpdateAutomation, useDeleteAutomation, useToggleAutomation)
2. Automations list page with: table/card view of all automations, active/paused toggle, create button, delete with confirm dialog
3. Create automation dialog/form: name, type select, optional schedule (cron string), config fields per type
4. Edit automation inline or via dialog
5. Run history expandable row or drawer

---

## 9. Known Issues / Watch Out For

### Critical gotchas

**Next.js 16 `proxy.ts`** — The route protection file is `src/proxy.ts`, NOT `src/middleware.ts`. It exports `function proxy(...)`, not `function middleware(...)`. This is the Next.js 16 breaking change. If you create a `middleware.ts` file, it will conflict.

**Tailwind v4 incompatibility** — The project is pinned to Tailwind v3 (`^3.4.19`). Do NOT run `npm install tailwindcss@latest` — v4 uses a completely different CSS-based config approach that breaks `tailwind.config.ts`. If you accidentally upgrade, downgrade back to 3.x.

**No shadcn CLI** — All UI components are hand-written Radix wrappers in `src/components/ui/`. Do not try to run `npx shadcn-ui add` or `npx shadcn add` — the CLI is not available and the components already exist.

**`useSearchParams()` requires Suspense** — Any client component using `useSearchParams()` must be wrapped in `<Suspense>` by its parent page. Already done for `login/page.tsx`. If you add `useSearchParams()` to another component, wrap it.

**`ApiError` is flat** — `{ code, message, status, field? }`. NOT a nested `errors[]` array. If you see backend error handling that expects `errors[0]`, fix it to use the flat shape.

**Admin route group subfolder** — Admin pages live at `(admin)/admin/PAGE/page.tsx` (not `(admin)/PAGE/page.tsx`) to avoid URL collision with dashboard routes. The URL is `/admin/users` etc.

### Settings page stubs

`settings/account/page.tsx` — change-password form submits with stub toast "Password change coming soon". The backend `/auth/change-password` endpoint doesn't exist yet. When the backend adds it, wire it up in `src/lib/api/endpoints/auth.ts` and update the page to call the real API.

`settings/danger/page.tsx` — delete workspace shows stub toast. Same situation for `/auth/delete-account`.

### SessionStorage keys (all one-shot, reset on new session)

| Key | Component | Behavior |
|---|---|---|
| `"bv_banner_dismissed"` | `BrandVoiceBanner` in Topbar | Hides amber brand voice nudge strip |
| `"onboarding_dismissed"` | `OnboardingBanner` | Hides floating bottom banner |
| `"onboarding_redirected"` | `useOnboardingRedirect` | Prevents re-redirecting to /settings/onboarding on every page load |

### Design rules (never break)

- **Amber `#F59E0B`** ONLY for: active nav, primary CTA, live status dot, focus rings. Not for decorative color.
- **Cyan `#06B6D4`** ONLY for: data values, chart lines, system metrics.
- **Never** use `rounded-xl` — max is `rounded-lg` (8px).
- **Never** white or light backgrounds. Minimum dark is `bg-bg-surface (#0D0E14)`.
- **Never** Inter font. Syne for headings, DM Sans for body, DM Mono for code/IDs/metrics.
- All IDs, tokens, numeric metrics **must** use `font-mono`.
- All API calls **must** go through `src/lib/api/client.ts`. Never `fetch()` in components.
- Access token **never** in localStorage or sessionStorage — only in memory (`_accessToken`).

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

# Generate TypeScript types from backend OpenAPI (requires running backend)
npm run gen-types
```

### Git

```bash
# Current branch
git status   # should be on claude/claude-md-documentation-TJtEy

# Push
git push -u origin claude/claude-md-documentation-TJtEy

# Recent commits (to see what was done)
git log --oneline -10
```

### Environment variables

Create `frontend/.env.local` with:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=Automate
```

The backend runs on port 8000 by default (`docker compose up` from `/home/user/claude-ads`).

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
```

## Appendix: TanStack Query Keys

```typescript
WORKSPACE_KEY   = ["workspace", "me"]
BRAND_VOICE_KEY = ["workspace", "brand-voice"]
SETTINGS_KEY    = ["workspace", "settings"]
// Automations (not yet defined — create in use-automations.ts)
// suggested: ["automations"] for list, ["automations", id] for single
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
| F3 | Automations CRUD — list, create, edit, delete, toggle | 🔄 **Active — start here** |
| F4 | Content queue — calendar view, approval workflow | ⬜ |
| F5 | Integrations — OAuth connect/disconnect flows | ⬜ |
| F6 | Analytics dashboard — charts, usage stats | ⬜ |
| F7 | Settings — billing, team (admin panel activated) | ⬜ |
| F8 | Admin panel — workspaces, usage, system health | ⬜ |
| F9 | E2E tests (Playwright) + accessibility audit | ⬜ |
