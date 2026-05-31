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
| Animation | Framer Motion (AiBubble drag) [SAAS] |
| Gesture | @use-gesture/react (AiBubble) [SAAS] |
| Billing | Stripe (redirect to hosted pages) [SAAS] |
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
      /(auth)           → /login, /register, /verify-email, /forgot-password, /reset-password [SAAS]
      /(dashboard)      → /automations, /content, /integrations, /analytics, /settings
      /(billing)        → /billing/plans, /billing/success, /billing/usage [SAAS]
      /(admin)          → /admin, /admin/workspaces, /admin/usage, /admin/system
      layout.tsx        → Root layout: QueryProvider + AuthProvider + Toaster
      globals.css       → Tailwind directives + CSS variables + component classes
    /components
      /ui               → Primitive components
      /layout
        Sidebar.tsx
        TopBar.tsx
        BottomNav.tsx   → Mobile-only 5-tab bar, safe-area-inset-bottom [SAAS]
      /auth             → LoginForm, RegisterForm
      /shared
        AiBubble.tsx    → Draggable floating assistant, SSE streaming [SAAS]
        UsageBar.tsx    → Plan quota progress bars, upgrade CTA at 100% [SAAS]
    /lib
      /api
        client.ts       → Core fetch wrapper
        billing.ts      → getUsage, getSubscription, createCheckout, createPortal [SAAS]
      /hooks
        usePersistentPosition.ts → localStorage-backed drag position [SAAS]
        useAssistantChat.ts      → SSE streaming hook [SAAS]
        useMediaQuery.ts         → useIsMobile() (breakpoint 767px) [SAAS]
    /hooks
      useBilling.ts     → TanStack Query billing hooks [SAAS]
  /public
    manifest.json       → PWA manifest (dark theme, standalone) [SAAS]
  tailwind.config.ts
  tsconfig.json
```

---

## Key Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run gen-types
```

---

## [SAAS] Billing Pages (`(billing)/`)

| Route | File | Description |
|---|---|---|
| `/billing/plans` | `(billing)/billing/plans/page.tsx` | Plan selector grid, calls `useCreateCheckout` |
| `/billing/success` | `(billing)/billing/success/page.tsx` | Post-checkout success, invalidates billing queries |
| `/billing/usage` | `(billing)/billing/usage/page.tsx` | Full usage dashboard with progress bars |

### `useBilling.ts` hooks

- `useUsage()` — `GET /billing/usage`, 60s stale
- `useSubscription()` — `GET /billing/subscription`
- `useCreateCheckout()` — mutation, redirects to Stripe on success
- `useCreatePortal()` — mutation, redirects to Stripe portal on success

### Plan display constants (`src/lib/api/billing.ts`)

```typescript
PLAN_LABELS: { free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }
PLAN_PRICES: { free: 0, starter: 29, pro: 79, enterprise: null }
```

---

## [SAAS] AI Bubble (`AiBubble.tsx`)

- Draggable Framer Motion bubble (drag disabled on mobile)
- Desktop: floating card constrained to viewport via `constraintsRef`
- Mobile: fixed `bottom-20 right-4`, chat panel covers 80vh
- Position persisted via `usePersistentPosition('ai-bubble-pos')`
- Messages from `useAssistantChat(pageContext)` SSE hook
- Amber background pulse ring animation
- `AssistantInput` auto-focuses on panel open

### `useAssistantChat(pageContext)` hook

- Returns `{ messages, isStreaming, send, clear }`
- Connects to `POST /api/v1/assistant/chat` with `Authorization: Bearer <token>`
- Reads SSE chunks and appends to last assistant message
- Clears on page navigation

---

## [SAAS] Bottom Navigation (`BottomNav.tsx`)

```tsx
className="fixed bottom-0 inset-x-0 md:hidden z-30 h-16"
```

- 5 tabs: Automations, Content, Integrations, Analytics, Settings
- `min-h-[44px] min-w-[44px]` Apple HIG touch targets
- Amber active state
- `env(safe-area-inset-bottom)` padding for iPhone notch
- Content behind nav hidden via `pb-16 md:pb-0` wrapper in dashboard layout

---

## [SAAS] Usage Bar (`UsageBar.tsx`)

- Hidden for pro/enterprise plans
- Shows automations + AI token progress bars
- Warning state at 80% (amber border)
- At 100%: shows upgrade CTA button linking to `/billing/plans`
- Placed in dashboard layout below sidebar

---

## [SAAS] Auth Pages (New)

| Route | Description |
|---|---|
| `/verify-email` | "Check your email" holding page + resend button |
| `/forgot-password` | RHF + Zod form → `POST /auth/forgot-password` |
| `/reset-password` | Token from `useSearchParams`, Suspense-wrapped → `POST /auth/reset-password` |

---

## [SAAS] PWA Manifest (`public/manifest.json`)

```json
{
  "theme_color": "#0A0B0F",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/automations"
}
```

Add `<link rel="manifest" href="/manifest.json" />` to root layout `<head>`.

---

## [SAAS] Dashboard Layout Updates (`(dashboard)/layout.tsx`)

```tsx
export default function DashboardLayout({ children }) {
  return (
    <>
      <DashboardShell>
        <div className="pb-16 md:pb-0">{children}</div>
      </DashboardShell>
      <OnboardingBanner />
      <BottomNav />
      <AiBubble />
    </>
  );
}
```

---

## [SAAS] Admin Billing Page (`(admin)/billing/page.tsx`)

- Plan/status/token summary cards
- Link to Stripe Dashboard (external)
- Accessible only to `is_admin = true` users

---

## API Client Rules

- **ALL API calls go through `src/lib/api/client.ts`**
- `api.get<T>()`, `api.post<T>()`, `api.patch<T>()`, `api.put<T>()`, `api.delete<T>()`
- Client auto-attaches `Authorization: Bearer <accessToken>`
- Refreshes on 401 via shared `_refreshPromise`
- Unwraps `{ data, ... }` envelope
- Throws `ApiError { status, message, code }` on non-2xx
- Handle HTTP 402 `quota_exceeded` by redirecting to `/billing/plans` [SAAS]

---

## Auth Architecture

```
Access token  → in-memory (_store in tokens.ts) — NEVER localStorage
Refresh token → js-cookie, secure: true, sameSite: "strict", 30-day expiry
```

- Auth redirects: ALWAYS `NextResponse.redirect()` in middleware — NEVER `router.push()`

---

## TanStack Query Conventions

- `staleTime: 30_000` default; billing queries `60_000`
- `retry: false` on 401, 403, 404
- Keys: `[resource, ...params]`
- Mutations always `invalidateQueries` on success

---

## Route Groups

| Group | Paths | Auth Required |
|---|---|---|
| `(auth)` | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | No |
| `(dashboard)` | `/automations`, `/content`, `/integrations`, `/analytics`, `/settings` | Yes |
| `(billing)` | `/billing/plans`, `/billing/success`, `/billing/usage` | Yes [SAAS] |
| `(admin)` | `/admin/*` | Yes + admin role |

---

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=AutoPilot
NEXT_PUBLIC_ADMIN_DOMAIN=admin
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_...   # [SAAS]
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_...       # [SAAS]
```

Never put secrets in `NEXT_PUBLIC_` variables.

---

## Common Mistakes to Avoid

- **Do NOT** use `fetch()` directly — always `src/lib/api/client.ts`
- **Do NOT** store access token in `localStorage`
- **Do NOT** use `rounded-xl` — use `rounded-lg`
- **Do NOT** use white/light backgrounds
- **Do NOT** use purple or blue for branding — amber only
- **Do NOT** use Inter font — Syne / DM Sans / DM Mono
- **Do NOT** call `router.push()` for auth redirects — `NextResponse.redirect()`
- **Do NOT** render IDs, tokens, or metrics in `font-sans` — always `font-mono`
- **Do NOT** skip Zod validation on form input
- **Do NOT** call Stripe checkout URL directly — use `useCreateCheckout()` mutation [SAAS]
- **Do NOT** show UsageBar for pro/enterprise users [SAAS]
- **Do NOT** enable Framer Motion drag on mobile in AiBubble [SAAS]

---

## Sprint Map

| Sprint | Focus | Status |
|--------|-------|--------|
| F1 | Scaffold | ✅ Done |
| F2 | Settings | ✅ Done |
| F3 | Integrations | ✅ Done |
| F4 | Automations | ✅ Done |
| F5 | Content Queue | ✅ Done |
| F6 | Analytics | ✅ Done |
| F7 | Audit + Admin | ✅ Done |
| F8 | Production | ✅ Done |
| F9 | Social Expansion | ✅ Done |
| S1 | SaaS: Billing + Stripe | ✅ Done |
| S2 | SaaS: Assistant Streaming | ✅ Done |
| S3 | SaaS: Mobile (BottomNav, AiBubble, PWA) | ✅ Done |
| S4 | SaaS: Auth flows (verify email, reset pw) | ✅ Done |
| S5 | SaaS: Marketing landing (Astro) | ✅ Done |
| S6 | SaaS: CLAUDE.md + hardening | ✅ Done |

## STATUS: SAAS LAYER COMPLETE ✅

---

## Architecture Notes (SaaS additions)

### AiBubble SSE Flow

1. User opens bubble panel → `useAssistantChat` initialised with current `pageContext`
2. `send(message)` → `POST /api/v1/assistant/chat` with SSE `Accept: text/event-stream`
3. Backend scans message (`require_clean`), writes audit log, calls Claude with streaming
4. Each SSE chunk passed through `redact_output` before yield
5. Frontend appends chunks to last assistant message in `messages` state
6. `isStreaming` set to `false` on `[DONE]` event

### Quota Enforcement Flow

1. User hits `POST /automations/` (or integrations/content)
2. `require_quota("automation")` dependency runs FIRST
3. Counts existing automations for workspace
4. If at limit → HTTP 402 `{"code": "quota_exceeded", ...}`
5. Frontend catches 402, redirects to `/billing/plans`
6. If under limit → proceeds to create automation

### Token Usage Tracking

1. Each `POST /assistant/chat` response streams via Claude SDK
2. After stream completes, `track_token_usage(workspace_id, tokens_used, db)` called
3. Increments `workspace.monthly_token_usage` (BigInteger)
4. `monthly_token_reset_date` checked on first usage each calendar month; resets if stale
5. `UsageBar` reads this from `GET /billing/usage`
