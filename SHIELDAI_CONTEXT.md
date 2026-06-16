# ShieldAI Dashboard — Master Context File

> Last updated: 2026-06-16
> Status: Active development
> Branch: claude/shieldai-context-merge-ft51ix

---

## LOCKED DECISIONS
> These decisions are finalized. Do NOT revisit unless the user explicitly requests it.

| # | Decision | Rationale |
|---|---|---|
| **L1** | **Single-file HTML/CSS/JS artifact** | Portable, no build step, entire dashboard ships as one `.html` file — easy to preview, share, and iterate |
| **L2** | **Top nav dropdown replacing sidebar** | Sidebar consumed too much horizontal real estate; dropdown nav scales better across viewport widths |
| **L3** | **Dark theme token values** | "Industrial command center" aesthetic; all CSS custom-property values in Section 5 are frozen |
| **L4** | **Null-guard pattern for all DOM lookups** | `classList` null-reference crashes were breaking interactions; every `document.querySelector` result must be null-checked before use |

---

## 1. Project Overview

ShieldAI Dashboard is a **9-page, single-file HTML/CSS/JS dashboard** artifact. It is delivered as
one standalone `.html` file with no external build tooling, bundlers, or framework dependencies. All
CSS lives in `<style>` blocks and all JavaScript lives in `<script>` blocks inside that file.

**Aesthetic:** "Industrial Command Center" — dark backgrounds, amber/cyan accents, monospace values
for metrics and IDs. Never use white or light backgrounds, `rounded-xl` cards, purple gradients,
or consumer-app color palettes.

---

## 2. Architecture

```
ShieldAI Dashboard (single .html file)
├── <head>
│   ├── <style>          ← All CSS + design tokens (CSS custom properties)
│   └── meta / title / font imports
├── <body>
│   ├── <nav>            ← Top navigation bar + dropdown menu  [LOCKED — replaces sidebar]
│   ├── <main>           ← Page container; JS swaps visible <section>
│   └── <script>         ← All JavaScript (routing, interactions, null-guarded DOM ops)
```

### Navigation (LOCKED — top nav dropdown)
- Left sidebar has been fully removed and replaced by a top nav bar with a dropdown menu.
- Active page is highlighted in the nav via a JS-toggled `.active` class.
- No page reloads — JS hides/shows `<section class="page-section">` elements on nav selection.

### Single-file delivery (LOCKED)
- No `import` / `require` / module bundling — vanilla ES6 inside `<script>` tags.
- No PostCSS, Webpack, Vite, Rollup, or any build pipeline.
- Deploy = copy one `.html` file.

---

## 3. Pages (9 total)

| # | Page | Section ID | Status |
|---|---|---|---|
| 1 | Dashboard / Overview | `page-dashboard` | ✅ Complete |
| 2 | Analytics | `page-analytics` | ✅ Complete |
| 3 | Automations | `page-automations` | ✅ Complete |
| 4 | Content Queue | `page-content` | ✅ Complete |
| 5 | Integrations | `page-integrations` | ✅ Complete |
| 6 | Audit Logs | `page-audit` | ✅ Complete |
| 7 | Settings | `page-settings` | ✅ Complete |
| 8 | Billing & Plans | `page-billing` | ✅ Added this sprint |
| 9 | *(TBD — needs content definition)* | `page-tbd` | ⬜ Pending |

---

## 4. Current State

> Updated: 2026-06-16

### Changes in this sprint
- **9 pages** now present (was 8) — Billing & Plans page added.
- **Sidebar → Top Nav Dropdown** — left sidebar fully removed; replaced by a top nav bar with a
  dropdown menu. Layout no longer reserves a fixed left column.
- **Billing & Plans page** — plan-tier cards, usage meters, and upgrade CTA added and wired into
  the nav routing table.
- **classList null-guard bugs patched** — every `document.querySelector(...)` that previously
  called `.classList.*` on a potentially-null result has been wrapped with an explicit null-check
  (see Section 7 for the canonical pattern).

### What is working
- All 9 pages render and are reachable via the top-nav dropdown.
- Dark theme is consistent across all pages.
- No null-reference crashes on classList operations.
- Single file opens directly in browser — no server required.

### Known gaps / next steps
- Page 9 placeholder content not yet defined.
- Top-nav dropdown mobile behaviour not tested below 375 px viewport width.
- Billing page upgrade flow is visual only — no backend wiring.

---

## 5. Design Tokens (LOCKED)

> These values are frozen. Do not alter without explicit user request.

```css
:root {
  /* Backgrounds */
  --bg-base:      #0D0E14;          /* page background */
  --bg-surface:   #13151F;          /* card / panel surface */
  --bg-elevated:  #1A1D2B;          /* dialogs, dropdowns */
  --bg-hover:     #1F2235;          /* hover state */

  /* Borders */
  --border:       #2A2D3E;
  --border-muted: #1E2030;

  /* Text */
  --text-primary: #E8E9F0;
  --text-muted:   #6B7099;
  --text-dim:     #3D4166;

  /* Accent — Amber (primary) */
  --amber:        #F59E0B;
  --amber-dim:    #78490A;
  --amber-glow:   rgba(245, 158, 11, 0.15);

  /* Accent — Cyan (data / metrics) */
  --cyan:         #06B6D4;
  --cyan-dim:     #0E5F6E;

  /* Semantic status */
  --success:      #10B981;
  --danger:       #EF4444;
  --warning:      #F59E0B;   /* same hue as --amber */
  --info:         #06B6D4;   /* same hue as --cyan */
}
```

**Colour usage rules (never override):**

| Token | Use ONLY for |
|---|---|
| `--amber` | Active nav item, primary CTA button, live/active status dot, focus ring |
| `--cyan` | Data values, chart lines, numeric metrics, system health indicators |
| `--success` | Success badges, "approved" / "published" states |
| `--danger` | Error badges, "failed" / "rejected" states, destructive button variant |
| `--warning` | Caution badges, "pending" / "expiring" states |

- Never use pure `#000` or pure `#FFF`.
- Minimum dark background value: `--bg-base` (`#0D0E14`).
- Border-radius cap: `8px` — never `12px` (`rounded-xl`) or above.

---

## 6. Component Inventory

All components are inline HTML + CSS classes + JS behaviour. No separate files.

| Component | DOM anchor | Notes |
|---|---|---|
| Top Nav Bar | `<nav class="top-nav">` | Brand logo, nav links, dropdown toggle |
| Nav Dropdown | `.nav-dropdown-menu` | Hidden by default; toggled via `.open` class |
| Page Router | JS `showPage(pageId)` | Hides all `.page-section`, shows target by ID |
| Dashboard Overview | `<section id="page-dashboard">` | KPI stat cards + recent activity feed |
| Analytics | `<section id="page-analytics">` | Time-series charts + platform breakdown |
| Automations | `<section id="page-automations">` | Automation card grid + status toggles |
| Content Queue | `<section id="page-content">` | Pending approval table + approve/reject actions |
| Integrations | `<section id="page-integrations">` | Provider connection cards + status badges |
| Audit Logs | `<section id="page-audit">` | Log table with action/date filters |
| Settings | `<section id="page-settings">` | Tabbed panels (workspace / brand voice / account) |
| Billing & Plans | `<section id="page-billing">` | Plan tier cards + usage meters + upgrade CTA |
| Stat Card | `.stat-card` CSS class | Reused in Dashboard and Analytics |
| Status Badge | `.badge`, `.badge--success`, `.badge--danger`, `.badge--warning`, `.badge--info` | Used across all pages |
| Data Table | `.data-table` CSS class | Used in Audit Logs and Content Queue |

---

## 7. JavaScript Patterns

### Null-guard — LOCKED (apply to every DOM lookup)

```javascript
// CORRECT — null-check before any DOM method call
const el = document.querySelector('.some-selector');
if (el) {
  el.classList.add('active');
}

// ALSO CORRECT — optional chaining for concise one-liners
document.querySelector('.some-selector')?.classList.toggle('open');

// NEVER DO THIS — crashes when element is absent
document.querySelector('.some-selector').classList.add('active'); // ❌
```

### Page navigation

```javascript
function showPage(pageId) {
  // querySelectorAll never returns null — safe without extra guard
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.add('hidden');
  });

  // getElementById CAN return null — guard required
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.remove('hidden');
  }

  // Sync nav active state
  document.querySelectorAll('[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });
}
```

### Dropdown nav open / close

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-dropdown-toggle');
  const menu   = document.querySelector('.nav-dropdown-menu');

  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu?.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    menu?.classList.remove('open');
  });
});
```

### General JS rules
- All DOM listener attachment wrapped inside `DOMContentLoaded`.
- `const` / `let` only — never `var`.
- Named functions for logic called from more than one place.
- No anonymous arrow functions as top-level page handlers.

---

## 8. Bug Log

| Bug | Root cause | Fix applied | Status |
|---|---|---|---|
| `Cannot read properties of null (reading 'classList')` on nav toggle | Script ran before DOM painted; `querySelector('.nav-dropdown-toggle')` returned `null` | Moved all listener attachment into `DOMContentLoaded`; added `?.` optional-chain null-guard | ✅ Fixed |
| `Cannot read properties of null (reading 'classList')` in `showPage()` | `getElementById(pageId)` returned `null` for unregistered page ID string | Added `if (target)` guard inside `showPage()` | ✅ Fixed |
| `classList` crash in outside-click handler | Handler registered before menu element existed in DOM | Wrapped entire handler block in `DOMContentLoaded`; null-guarded `menu?.classList.remove(...)` | ✅ Fixed |

---

## 9. Coding Standards (Single-File Context)

### HTML
- Semantic landmarks: `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`.
- All page sections: `<section class="page-section hidden" id="page-{name}">`.
- IDs for JS targeting; classes for CSS styling — never select by ID in CSS.

### CSS
- All values defined as CSS custom properties in `:root` (Section 5 — LOCKED).
- BEM-light naming: `.component`, `.component__element`, `.component--modifier`.
- No inline `style=""` attributes — styling via classes only.
- No `!important`.
- Max border-radius: `8px`.

### JavaScript
- Vanilla ES6+ — no external libraries, no module imports.
- Every `document.querySelector` result null-guarded before method call (L4 — LOCKED).
- All event listeners attached inside `DOMContentLoaded`.
- `const` / `let` — no `var`.

---

## 10. File Delivery

| Property | Value |
|---|---|
| Format | Single `.html` file |
| Opens without server | Yes — `file://` protocol works |
| Target file size | < 500 KB |
| Character encoding | UTF-8 |
| Browser support | Chrome 100+, Firefox 100+, Safari 15+, Edge 100+ |

---

## Sprint Log

| Sprint | Changes | Date | Status |
|---|---|---|---|
| Initial build | 8-page single-file dashboard with left sidebar nav | — | ✅ Done |
| Context merge sprint | Sidebar → top nav dropdown; Billing & Plans page (page 9 slot now 8); classList null-guard bugs patched; 9 pages total | 2026-06-16 | ✅ Done |

---

## Notes for Future Sessions

- The `SOURCE CONTEXT BLOCK` placeholder in the original context-merge task was empty. If a
  compressed context block from a prior session becomes available, merge its architecture /
  component / token / JS / bug details into the relevant sections above without duplicating existing
  entries.
- Do **not** revisit LOCKED decisions (L1–L4) unless the user explicitly requests it.
- Page 9 content needs a definition before the next build sprint can begin.
- Mobile responsiveness of top-nav dropdown below 375 px has not been tested — flag this before
  any mobile-first sprint.
