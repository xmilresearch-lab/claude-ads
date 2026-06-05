/**
 * $100M AI Sales Team — Build Plan Dashboard
 *
 * Paste the contents of this file into a Claude.ai chat and ask:
 * "Render this as an interactive artifact"
 *
 * Tabs: Overview · Tech Stack · Backend Code · Security · Mobile/PWA · Claude Code · Roadmap
 */

import { useState } from "react";

/* ── GLOBAL STYLES ── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
:root{
  --bg:#F7F6F3;--surf:#fff;--surf2:#F1F0ED;--surf3:#E8E7E3;
  --bd:rgba(0,0,0,.08);--bd2:rgba(0,0,0,.14);
  --ink:#17171A;--ink2:#6B6F7A;--ink3:#A8AAAF;
  --acc:#EA580C;--acc-lt:rgba(234,88,12,.09);--acc-dk:#C2470A;
  --blue:#2563EB;--blue-lt:rgba(37,99,235,.09);
  --green:#059669;--green-lt:rgba(5,150,105,.09);
  --amber:#D97706;--amber-lt:rgba(217,119,6,.09);
  --purple:#7C3AED;--purple-lt:rgba(124,58,237,.09);
  --red:#DC2626;--red-lt:rgba(220,38,38,.09);
  --cyan:#0891B2;--cyan-lt:rgba(8,145,178,.09);
  --sh1:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --sh2:0 4px 12px rgba(0,0,0,.08),0 2px 4px rgba(0,0,0,.04);
  --r:8px;--rl:14px;
  --display:'Bricolage Grotesque',sans-serif;
  --body:'DM Sans',sans-serif;
  --mono:'DM Mono',monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
body{background:var(--bg);color:var(--ink);font-family:var(--body);-webkit-font-smoothing:antialiased}
*{scrollbar-width:thin;scrollbar-color:var(--surf3) var(--bg)}
*::-webkit-scrollbar{width:4px;height:4px}
*::-webkit-scrollbar-thumb{background:var(--surf3);border-radius:3px}

.app{min-height:100vh;background:var(--bg);display:flex;flex-direction:column}

/* topbar */
.tb{background:var(--surf);border-bottom:1px solid var(--bd);height:52px;padding:0 clamp(1rem,3vw,2rem);display:flex;align-items:center;gap:1rem;position:sticky;top:0;z-index:100}
.tb-logo{display:flex;align-items:center;gap:.5rem;font-family:var(--display);font-weight:800;font-size:.9rem;color:var(--ink);letter-spacing:-.025em;flex-shrink:0}
.tb-icon{width:26px;height:26px;border-radius:6px;background:linear-gradient(135deg,var(--acc),#F97316);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;color:#fff}
.tb-div{width:1px;height:18px;background:var(--bd2);flex-shrink:0}
.tb-sub{font-size:.72rem;color:var(--ink3);white-space:nowrap}
.tb-sp{flex:1}
.tb-tag{font-family:var(--display);font-size:.58rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:linear-gradient(135deg,var(--blue-lt),var(--green-lt));color:var(--blue);border:1px solid rgba(37,99,235,.2);padding:.2rem .6rem;border-radius:20px;white-space:nowrap}

/* nav */
.nav{background:var(--surf);border-bottom:1px solid var(--bd);padding:0 clamp(1rem,3vw,2rem);display:flex;gap:0;overflow-x:auto;scrollbar-width:none}
.nav::-webkit-scrollbar{display:none}
.nt{display:flex;align-items:center;gap:.4rem;padding:.65rem 1rem;font-size:.78rem;font-weight:500;color:var(--ink2);background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;margin-bottom:-1px;transition:color .15s,border-color .15s}
.nt:hover{color:var(--ink)}
.nt.on{color:var(--acc);border-bottom-color:var(--acc);font-weight:600}
.nt svg{width:14px;height:14px;opacity:.6}
.nt.on svg{opacity:1}

/* main */
.main{flex:1;padding:clamp(1rem,3vw,1.75rem) clamp(1rem,3vw,2rem);max-width:1280px;margin:0 auto;width:100%}

/* page header */
.ph{margin-bottom:1.5rem;padding-bottom:1.25rem;border-bottom:1px solid var(--bd)}
.ph-title{font-family:var(--display);font-size:clamp(1.4rem,3vw,1.9rem);font-weight:800;letter-spacing:-.03em;color:var(--ink);margin-bottom:.3rem}
.ph-desc{font-size:.84rem;color:var(--ink2);line-height:1.7;max-width:640px}
.ph-meta{display:flex;gap:1.25rem;margin-top:.9rem;flex-wrap:wrap}
.pm-val{font-family:var(--display);font-size:1.4rem;font-weight:800;letter-spacing:-.03em}
.pm-lbl{font-size:.65rem;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.08em}

/* section label */
.sl{font-family:var(--display);font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);margin-bottom:.65rem;margin-top:1.5rem;display:flex;align-items:center;gap:.5rem}
.sl:first-child{margin-top:0}
.sl::after{content:'';flex:1;height:1px;background:var(--bd)}

/* col / grids */
.col{display:flex;flex-direction:column;gap:.9rem}
.g2{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:.9rem}
.g3{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:.9rem}
.g4{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:.75rem}

/* card */
.card{background:var(--surf);border:1px solid var(--bd);border-radius:var(--rl);padding:1.25rem;box-shadow:var(--sh1);animation:fu .4s var(--ease) both}
.card:hover{box-shadow:var(--sh2)}
.ct{font-family:var(--display);font-size:.88rem;font-weight:700;color:var(--ink);margin-bottom:.35rem;letter-spacing:-.015em}
.cb{font-size:.8rem;color:var(--ink2);line-height:1.65}

@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.d1{animation-delay:.03s}.d2{animation-delay:.06s}.d3{animation-delay:.09s}
.d4{animation-delay:.12s}.d5{animation-delay:.15s}.d6{animation-delay:.18s}

/* kpi */
.kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr));gap:.75rem;margin-bottom:.5rem}
.kpi{background:var(--surf);border:1px solid var(--bd);border-radius:var(--rl);padding:1rem 1.1rem;box-shadow:var(--sh1);animation:fu .4s var(--ease) both;position:relative;overflow:hidden}
.kpi::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:var(--kc,var(--acc))}
.kpi-l{font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:var(--ink3);margin-bottom:.4rem}
.kpi-v{font-family:var(--display);font-size:1.55rem;font-weight:800;letter-spacing:-.04em;color:var(--kc,var(--acc));line-height:1;margin-bottom:.2rem}
.kpi-s{font-size:.72rem;color:var(--ink2)}

/* code block */
.code-wrap{background:#0F1117;border:1px solid rgba(255,255,255,.08);border-radius:var(--rl);overflow:hidden;animation:fu .4s var(--ease) both}
.code-bar{display:flex;align-items:center;gap:.5rem;padding:.6rem 1rem;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03)}
.code-dots{display:flex;gap:.35rem}
.code-dot{width:10px;height:10px;border-radius:50%}
.code-filename{font-family:var(--mono);font-size:.68rem;color:rgba(255,255,255,.35);margin-left:.25rem}
.code-copy{margin-left:auto;font-family:var(--display);font-size:.58rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);cursor:pointer;background:none;border:none;transition:color .15s}
.code-copy:hover{color:rgba(255,255,255,.7)}
.code-body{padding:1rem 1.1rem;overflow-x:auto}
pre{font-family:var(--mono);font-size:.76rem;line-height:1.75;color:#E5E7EB;white-space:pre;margin:0}
.kw{color:#F472B6}
.fn{color:#60A5FA}
.st{color:#A3E635}
.cm{color:#6B7280;font-style:italic}
.num{color:#FB923C}
.ty{color:#34D399}
.op{color:#94A3B8}

/* prompt block */
.prompt{background:linear-gradient(135deg,rgba(37,99,235,.05),rgba(124,58,237,.05));border:1px solid rgba(37,99,235,.18);border-radius:var(--rl);padding:1.1rem 1.2rem;animation:fu .4s var(--ease) both}
.prompt-label{font-family:var(--display);font-size:.58rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);margin-bottom:.55rem;display:flex;align-items:center;gap:.4rem}
.prompt-label::before{content:'>';font-family:var(--mono);font-size:.8rem}
.prompt-text{font-family:var(--mono);font-size:.78rem;color:var(--ink);line-height:1.7}
.prompt-note{font-size:.74rem;color:var(--ink3);margin-top:.55rem;font-style:italic}

/* phase */
.phase{background:var(--surf);border:1px solid var(--bd);border-radius:var(--rl);overflow:hidden;box-shadow:var(--sh1);animation:fu .4s var(--ease) both}
.phase-h{display:flex;align-items:center;gap:1rem;padding:1rem 1.2rem;border-bottom:1px solid var(--bd)}
.phase-n{font-family:var(--display);font-size:1.5rem;font-weight:800;color:var(--ink3);min-width:2rem}
.phase-info{flex:1}
.phase-period{font-family:var(--display);font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);margin-bottom:.15rem}
.phase-title{font-family:var(--display);font-size:.95rem;font-weight:800;color:var(--ink);letter-spacing:-.02em}
.phase-badge{font-family:var(--display);font-size:.65rem;font-weight:700;padding:.28rem .65rem;border-radius:20px;white-space:nowrap}
.phase-body{padding:1.1rem 1.2rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:1rem}
.phase-track-lbl{font-family:var(--display);font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--acc);margin-bottom:.4rem}
.phase-items{display:flex;flex-direction:column;gap:.35rem}
.phase-item{display:flex;gap:.4rem;font-size:.77rem;color:var(--ink2);line-height:1.5}
.phase-dot{width:4px;height:4px;border-radius:50%;background:var(--ink3);flex-shrink:0;margin-top:.52rem}

/* framework annotation */
.anno{display:flex;gap:.6rem;align-items:flex-start;padding:.75rem .9rem;border-radius:var(--r);border:1px solid;margin-bottom:.5rem;animation:fu .4s var(--ease) both}
.anno-icon{font-family:var(--display);font-size:.62rem;font-weight:800;padding:.15rem .45rem;border-radius:4px;flex-shrink:0;white-space:nowrap;margin-top:.05rem}
.anno-text{font-size:.8rem;color:var(--ink2);line-height:1.6}

/* stack card */
.stack-card{background:var(--surf);border:1px solid var(--bd);border-radius:var(--rl);padding:1.1rem 1.2rem;animation:fu .4s var(--ease) both;border-left:4px solid var(--sc,var(--acc))}
.sc-layer{font-family:var(--display);font-size:.58rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--sc,var(--acc));margin-bottom:.3rem}
.sc-tech{font-family:var(--display);font-size:.88rem;font-weight:800;color:var(--ink);letter-spacing:-.015em;margin-bottom:.2rem}
.sc-why{font-size:.78rem;color:var(--ink2);line-height:1.6;margin-bottom:.5rem}
.sc-tags{display:flex;gap:.3rem;flex-wrap:wrap}
.tag{font-family:var(--display);font-size:.58rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:.18rem .5rem;border-radius:4px}

/* file tree */
.tree{background:#0F1117;border:1px solid rgba(255,255,255,.08);border-radius:var(--rl);padding:1rem 1.2rem;font-family:var(--mono);font-size:.74rem;line-height:1.9;color:#9CA3AF;animation:fu .4s var(--ease) both}
.tree-dir{color:#60A5FA;font-weight:500}
.tree-file{color:#E5E7EB}
.tree-comment{color:#4B5563}

/* security card */
.sec-item{display:flex;gap:.8rem;align-items:flex-start;padding:.9rem 1rem;background:var(--surf);border:1px solid var(--bd);border-radius:var(--r);animation:fu .4s var(--ease) both;transition:border-color .15s}
.sec-item:hover{border-color:var(--red)}
.sec-icon{width:28px;height:28px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.85rem}
.sec-body{}
.sec-name{font-family:var(--display);font-size:.82rem;font-weight:700;color:var(--ink);margin-bottom:.18rem;letter-spacing:-.01em}
.sec-desc{font-size:.78rem;color:var(--ink2);line-height:1.55}
.sec-impl{font-family:var(--mono);font-size:.7rem;color:var(--acc);margin-top:.3rem}

/* mobile checklist */
.mob-item{display:flex;gap:.7rem;align-items:flex-start;padding:.8rem 1rem;background:var(--surf);border:1px solid var(--bd);border-radius:var(--r);animation:fu .4s var(--ease) both}
.mob-check{width:18px;height:18px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:800;margin-top:.05rem}
.mob-info{}
.mob-name{font-family:var(--display);font-size:.82rem;font-weight:700;color:var(--ink);margin-bottom:.12rem}
.mob-desc{font-size:.78rem;color:var(--ink2);line-height:1.55}

/* table */
.tbl-wrap{border:1px solid var(--bd);border-radius:var(--rl);overflow:hidden;box-shadow:var(--sh1)}
.tbl{width:100%;border-collapse:collapse;font-size:.78rem;min-width:480px}
.tbl thead{background:var(--surf2)}
.tbl th{padding:.65rem .9rem;text-align:left;font-family:var(--display);font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);border-bottom:1px solid var(--bd)}
.tbl td{padding:.75rem .9rem;border-bottom:1px solid var(--bd);color:var(--ink2);vertical-align:top;line-height:1.5}
.tbl tbody tr:last-child td{border-bottom:none}
.tbl tbody tr:hover{background:var(--surf2)}
.tbl td.nm{font-weight:600;color:var(--ink);font-family:var(--display);font-size:.8rem}
.chip{display:inline-flex;align-items:center;padding:.15rem .5rem;border-radius:20px;font-family:var(--display);font-size:.6rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase}

@media(max-width:600px){.ph-title{font-size:1.3rem}.kpi-v{font-size:1.3rem}}
`;

/* ── CODE BLOCK ── */
function CodeBlock({ filename, children, copied, onCopy }) {
  return (
    <div className="code-wrap">
      <div className="code-bar">
        <div className="code-dots">
          <div className="code-dot" style={{ background: "#FF5F57" }} />
          <div className="code-dot" style={{ background: "#FEBC2E" }} />
          <div className="code-dot" style={{ background: "#28C840" }} />
        </div>
        <span className="code-filename">{filename}</span>
        <button className="code-copy" onClick={onCopy}>{copied ? "copied!" : "copy"}</button>
      </div>
      <div className="code-body">
        <pre dangerouslySetInnerHTML={{ __html: children }} />
      </div>
    </div>
  );
}

/* ── FRAMEWORK ANNO ── */
const ANNO_COLORS = {
  Hormozi: { bg: "rgba(79,70,229,.08)", border: "rgba(79,70,229,.2)", icon: { bg: "rgba(79,70,229,.15)", color: "#4F46E5" } },
  GaryVee: { bg: "rgba(147,51,234,.08)", border: "rgba(147,51,234,.2)", icon: { bg: "rgba(147,51,234,.15)", color: "#9333EA" } },
  Cardone: { bg: "rgba(220,38,38,.06)", border: "rgba(220,38,38,.18)", icon: { bg: "rgba(220,38,38,.12)", color: "#DC2626" } },
  Belfort: { bg: "rgba(217,119,6,.07)", border: "rgba(217,119,6,.2)", icon: { bg: "rgba(217,119,6,.14)", color: "#D97706" } },
  Kennedy: { bg: "rgba(8,145,178,.07)", border: "rgba(8,145,178,.2)", icon: { bg: "rgba(8,145,178,.14)", color: "#0891B2" } },
  Brunson: { bg: "rgba(5,150,105,.07)", border: "rgba(5,150,105,.2)", icon: { bg: "rgba(5,150,105,.14)", color: "#059669" } },
  Godin:   { bg: "rgba(219,39,119,.07)", border: "rgba(219,39,119,.2)", icon: { bg: "rgba(219,39,119,.14)", color: "#DB2777" } },
  Robbins: { bg: "rgba(234,88,12,.08)", border: "rgba(234,88,12,.2)", icon: { bg: "rgba(234,88,12,.14)", color: "#EA580C" } },
};
function Anno({ expert, text }) {
  const c = ANNO_COLORS[expert] || ANNO_COLORS.Robbins;
  return (
    <div className="anno" style={{ background: c.bg, borderColor: c.border }}>
      <span className="anno-icon" style={{ background: c.icon.bg, color: c.icon.color }}>{expert}</span>
      <span className="anno-text">{text}</span>
    </div>
  );
}

/* ── PROMPT BLOCK ── */
function Prompt({ label, children, note }) {
  return (
    <div className="prompt">
      <div className="prompt-label">Claude Code Prompt — {label}</div>
      <div className="prompt-text">{children}</div>
      {note && <div className="prompt-note">↳ {note}</div>}
    </div>
  );
}

/* ── DATA ── */
const STACK = [
  { layer: "Runtime", tech: "Next.js 14 (App Router)", why: "Full-stack React with API routes, server components, and edge middleware in one repo. One codebase for web and mobile web.", tags: ["SSR", "Edge", "TypeScript"], color: "#17171A" },
  { layer: "Database", tech: "Supabase (PostgreSQL)", why: "Row-Level Security out of the box. Auth, real-time, and storage included. RLS eliminates an entire category of data leakage bugs.", tags: ["RLS", "Auth", "Real-time"], color: "#059669" },
  { layer: "ORM", tech: "Prisma", why: "Type-safe queries that eliminate SQL injection at the schema level. Generated types flow through the entire stack.", tags: ["Type-safe", "Migrations", "Studio"], color: "#2563EB" },
  { layer: "Auth", tech: "Supabase Auth + NextAuth", why: "JWT sessions with refresh tokens. Social OAuth (Google, LinkedIn). Magic links for mobile friction-free login.", tags: ["OAuth", "JWT", "Magic Links"], color: "#7C3AED" },
  { layer: "Payments", tech: "Stripe Subscriptions", why: "Webhooks handle all billing events. Customer Portal means zero custom billing UI. Metered usage for API tier.", tags: ["Webhooks", "Portal", "Metered"], color: "#635BFF" },
  { layer: "AI Engine", tech: "Anthropic Claude API", why: "claude-sonnet-4-20250514 for analysis. Streaming responses. Server-side API calls — keys never exposed to browser.", tags: ["Streaming", "Server-side", "Secure"], color: "#EA580C" },
  { layer: "Rate Limiting", tech: "Upstash Redis + Ratelimit", why: "Per-user, per-tier sliding window rate limits. Blocks abuse before it hits the AI API. Tier quotas enforced at middleware.", tags: ["Sliding window", "Per-tier", "Edge"], color: "#D97706" },
  { layer: "Email", tech: "Resend + React Email", why: "Soap Opera Sequence (5-email automation), billing alerts, weekly digest. React components as email templates.", tags: ["Automation", "Transactional", "Templates"], color: "#0891B2" },
  { layer: "Monitoring", tech: "Sentry + PostHog + Vercel", why: "Error tracking, product analytics, performance. PostHog funnel analysis ties directly to conversion metrics.", tags: ["Errors", "Funnels", "Performance"], color: "#DC2626" },
  { layer: "Deployment", tech: "Vercel + CDN", why: "Instant rollbacks. Preview deployments per PR. Edge network — sub-50ms globally. Auto-scaling handles viral spikes.", tags: ["Edge", "Preview", "Auto-scale"], color: "#000" },
];

const SECURITY = [
  { icon: "🔑", name: "API Key Never Exposed", desc: "All Anthropic API calls happen server-side in Next.js API routes or server actions. The key never reaches the browser bundle.", impl: "ANTHROPIC_API_KEY → server-only env var, validated at startup" },
  { icon: "🛡️", name: "Row-Level Security (RLS)", desc: "Supabase RLS policies enforce that users can only read/write their own analyses, even if the query is crafted maliciously.", impl: "CREATE POLICY user_isolation ON analyses USING (user_id = auth.uid())" },
  { icon: "⏱️", name: "Per-Tier Rate Limiting", desc: "Upstash Redis sliding window: Free=3/day, Solo=50/day, Pro=unlimited. Enforced in Next.js middleware before any AI call.", impl: "ratelimit.limit(`analysis:${userId}`) → 429 if exceeded" },
  { icon: "🧹", name: "Input Sanitization (Zod)", desc: "Every API route validates input shape with Zod schemas. Malformed payloads are rejected before processing — no prompt injection.", impl: "z.string().max(5000).trim().parse(body.offer)" },
  { icon: "🔐", name: "Webhook Signature Verification", desc: "Stripe webhooks are verified with constructEvent() using the signing secret. Spoofed billing events are impossible.", impl: "stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)" },
  { icon: "🌐", name: "CORS + CSP Headers", desc: "Next.js middleware enforces Content-Security-Policy headers. Prevents XSS, clickjacking, and iframe embedding attacks.", impl: "next.config.js headers() → CSP, X-Frame-Options: DENY" },
  { icon: "🔒", name: "JWT Refresh + Session Rotation", desc: "Supabase Auth rotates refresh tokens on every use. Session hijacking window is a single request lifetime.", impl: "supabase.auth.setSession() + cookie-based HttpOnly storage" },
  { icon: "📊", name: "Audit Logging", desc: "Every AI analysis call, plan upgrade, and API key use is logged to a Supabase audit_logs table. Compliance-ready from day one.", impl: "supabase.from('audit_logs').insert({user_id, action, metadata})" },
];

const MOBILE = [
  { label: "PWA Manifest", desc: "next-pwa generates manifest.json and service worker. Users can 'Add to Home Screen' on iOS/Android — app-like experience without app store.", color: "#2563EB" },
  { label: "Bottom Navigation", desc: "On viewport < 768px, the top nav collapses to a fixed bottom nav bar with 5 icon tabs. Thumb-friendly zone on all phone sizes.", color: "#059669" },
  { label: "Touch Gestures", desc: "Swipe-to-dismiss modals, pull-to-refresh on analysis history, pinch-to-zoom on framework cards. react-use-gesture handles all touch events.", color: "#7C3AED" },
  { label: "Offline Cache", desc: "Service worker caches the last 10 analyses. Users can review previous strategies without connectivity. IndexedDB for analysis history.", color: "#D97706" },
  { label: "Streaming on Mobile", desc: "Analysis responses stream token-by-token via ReadableStream. Mobile users see results appearing in real time — no loading spinners.", color: "#EA580C" },
  { label: "Mobile Auth", desc: "Magic link auth (tap email link → instant login) removes password friction on mobile. Social login with one tap via Google OAuth.", color: "#0891B2" },
  { label: "Haptic Feedback", desc: "navigator.vibrate() on analysis complete, upgrade prompts, and error states. Physical feedback makes the app feel native.", color: "#DC2626" },
  { label: "Viewport Meta + Safe Areas", desc: "env(safe-area-inset-*) padding for notched phones. Viewport meta prevents zoom on input focus — common iOS UX bug.", color: "#059669" },
];

const PHASES = [
  {
    n:"01", period:"Week 1", title:"Foundation & Auth", badge:"SHIP FIRST",
    badgeStyle:"background:rgba(37,99,235,.1);color:#2563EB;border:1px solid rgba(37,99,235,.2)",
    tracks:[
      { lbl:"Database", items:["Supabase project init + schema.prisma","Users, analyses, subscriptions, audit_logs tables","RLS policies for all tables","Seed data for dev environment"] },
      { lbl:"Auth", items:["NextAuth.js + Supabase adapter","Google OAuth + magic link config","Middleware: protect /dashboard routes","Session types + TypeScript generics"] },
      { lbl:"Infra", items:["Vercel project + environment vars","GitHub Actions CI/CD pipeline","Sentry error tracking init","PostHog analytics snippet"] },
    ]
  },
  {
    n:"02", period:"Week 2", title:"AI Engine + Billing", badge:"CORE VALUE",
    badgeStyle:"background:rgba(234,88,12,.1);color:#EA580C;border:1px solid rgba(234,88,12,.2)",
    tracks:[
      { lbl:"AI API", items:["POST /api/analyze route (server-side Anthropic call)","Streaming response via ReadableStream","Zod input validation + sanitization","Per-tier rate limiting via Upstash"] },
      { lbl:"Billing", items:["Stripe Products: Free, Solo $49, Pro $149, Agency $497","Webhook handler: checkout.completed, subscription.updated","Customer Portal link generation","Tier enforcement in middleware"] },
      { lbl:"Storage", items:["Supabase: save analysis to DB","Analysis history API route","Soft-delete for cancelled accounts","Export to PDF (react-pdf/renderer)"] },
    ]
  },
  {
    n:"03", period:"Week 3", title:"Frontend + Mobile PWA", badge:"USER EXPERIENCE",
    badgeStyle:"background:rgba(124,58,237,.1);color:#7C3AED;border:1px solid rgba(124,58,237,.2)",
    tracks:[
      { lbl:"Dashboard", items:["Analysis input + streaming output UI","8-framework accordion results","History sidebar + search","Team workspace UI (Pro+)"] },
      { lbl:"Mobile", items:["next-pwa config + service worker","Bottom nav component (< 768px)","Touch gesture library integration","Safe area insets + viewport fix"] },
      { lbl:"Upgrade Flow", items:["Upgrade modal inside result page (Brunson OTO)","Tier comparison page","Stripe Checkout redirect","Success/cancel webhook handlers"] },
    ]
  },
  {
    n:"04", period:"Week 4", title:"AI Assistant + Agency", badge:"DIFFERENTIATION",
    badgeStyle:"background:rgba(5,150,105,.1);color:#059669;border:1px solid rgba(5,150,105,.2)",
    tracks:[
      { lbl:"AI Assistant", items:["Persistent chat sidebar (all pages)","Context-aware: knows user's analysis history","Streaming chat responses","System prompt: 8-framework coaching mode"] },
      { lbl:"Agency Tier", items:["White-label domain config (CNAME)","Client portal: separate workspace per client","Agency dashboard: all client analyses","Branded PDF exports with custom logo"] },
      { lbl:"Growth", items:["Resend email automation: Soap Opera Sequence","Referral program: 30% recurring commission","Shareable analysis cards (OG image generation)","Affiliate dashboard"] },
    ]
  },
];

const CODE_SAMPLES = {
  schema: `<span class="cm">// prisma/schema.prisma — Database Schema</span>

<span class="kw">model</span> <span class="ty">User</span> {
  id            <span class="ty">String</span>   <span class="op">@id</span> <span class="op">@default</span>(cuid())
  email         <span class="ty">String</span>   <span class="op">@unique</span>
  name          <span class="ty">String?</span>
  stripeCustomerId <span class="ty">String?</span>
  tier          <span class="ty">Tier</span>     <span class="op">@default</span>(FREE)
  analyses      <span class="ty">Analysis[]</span>
  subscription  <span class="ty">Subscription?</span>
  teamId        <span class="ty">String?</span>
  createdAt     <span class="ty">DateTime</span> <span class="op">@default</span>(now())
}

<span class="kw">model</span> <span class="ty">Analysis</span> {
  id            <span class="ty">String</span>   <span class="op">@id</span> <span class="op">@default</span>(cuid())
  userId        <span class="ty">String</span>
  user          <span class="ty">User</span>     <span class="op">@relation</span>(fields: [userId], references: [id])
  offerText     <span class="ty">String</span>
  analysisType  <span class="ty">String</span>   <span class="cm">// offer | problem | challenge</span>
  result        <span class="ty">Json</span>     <span class="cm">// Full 8-framework JSON</span>
  shared        <span class="ty">Boolean</span>  <span class="op">@default</span>(<span class="num">false</span>)
  shareToken    <span class="ty">String?</span>  <span class="op">@unique</span> <span class="op">@default</span>(cuid())
  createdAt     <span class="ty">DateTime</span> <span class="op">@default</span>(now())
}

<span class="kw">enum</span> <span class="ty">Tier</span> {
  FREE SOLO PRO AGENCY ENTERPRISE
}`,

  analyze: `<span class="cm">// app/api/analyze/route.ts — AI Analysis Endpoint</span>
<span class="kw">import</span> { NextRequest } <span class="kw">from</span> <span class="st">'next/server'</span>
<span class="kw">import</span> Anthropic <span class="kw">from</span> <span class="st">'@anthropic-ai/sdk'</span>
<span class="kw">import</span> { ratelimit } <span class="kw">from</span> <span class="st">'@/lib/ratelimit'</span>
<span class="kw">import</span> { analyzeSchema } <span class="kw">from</span> <span class="st">'@/lib/schemas'</span>
<span class="kw">import</span> { getServerSession } <span class="kw">from</span> <span class="st">'next-auth'</span>

<span class="kw">const</span> client <span class="op">=</span> <span class="kw">new</span> <span class="fn">Anthropic</span>() <span class="cm">// uses ANTHROPIC_API_KEY server-side</span>

<span class="kw">export async function</span> <span class="fn">POST</span>(req: NextRequest) {
  <span class="cm">// 1. Auth check</span>
  <span class="kw">const</span> session <span class="op">=</span> <span class="kw">await</span> <span class="fn">getServerSession</span>()
  <span class="kw">if</span> (!session) <span class="kw">return</span> <span class="fn">Response</span>.json({ error: <span class="st">'Unauthorized'</span> }, { status: <span class="num">401</span> })

  <span class="cm">// 2. Rate limit by user + tier</span>
  <span class="kw">const</span> { success } <span class="op">=</span> <span class="kw">await</span> ratelimit.<span class="fn">limit</span>(<span class="st">\`analysis:\${session.user.id}\`</span>)
  <span class="kw">if</span> (!success) <span class="kw">return</span> <span class="fn">Response</span>.json({ error: <span class="st">'Rate limit exceeded'</span> }, { status: <span class="num">429</span> })

  <span class="cm">// 3. Validate + sanitize input (Zod)</span>
  <span class="kw">const</span> body <span class="op">=</span> analyzeSchema.<span class="fn">parse</span>(<span class="kw">await</span> req.<span class="fn">json</span>())

  <span class="cm">// 4. Stream from Anthropic</span>
  <span class="kw">const</span> stream <span class="op">=</span> <span class="kw">await</span> client.messages.<span class="fn">stream</span>({
    model: <span class="st">'claude-sonnet-4-20250514'</span>,
    max_tokens: <span class="num">4000</span>,
    system: SYSTEM_PROMPT,
    messages: [{ role: <span class="st">'user'</span>, content: body.offerText }]
  })

  <span class="cm">// 5. Return ReadableStream to client</span>
  <span class="kw">return new</span> <span class="fn">Response</span>(stream.toReadableStream(), {
    headers: { <span class="st">'Content-Type'</span>: <span class="st">'text/event-stream'</span> }
  })
}`,

  ratelimit: `<span class="cm">// lib/ratelimit.ts — Per-Tier Rate Limiting</span>
<span class="kw">import</span> { Ratelimit } <span class="kw">from</span> <span class="st">'@upstash/ratelimit'</span>
<span class="kw">import</span> { Redis } <span class="kw">from</span> <span class="st">'@upstash/redis'</span>

<span class="kw">const</span> redis <span class="op">=</span> <span class="fn">Redis</span>.fromEnv()

<span class="kw">export const</span> TIER_LIMITS <span class="op">=</span> {
  FREE:       { requests: <span class="num">3</span>,   window: <span class="st">'1 d'</span> },
  SOLO:       { requests: <span class="num">50</span>,  window: <span class="st">'1 d'</span> },
  PRO:        { requests: <span class="num">9999</span>,window: <span class="st">'1 d'</span> }, <span class="cm">// effectively unlimited</span>
  AGENCY:     { requests: <span class="num">9999</span>,window: <span class="st">'1 d'</span> },
  ENTERPRISE: { requests: <span class="num">9999</span>,window: <span class="st">'1 d'</span> },
}

<span class="kw">export function</span> <span class="fn">getRatelimiter</span>(tier: <span class="ty">keyof typeof</span> TIER_LIMITS) {
  <span class="kw">const</span> { requests, window } <span class="op">=</span> TIER_LIMITS[tier]
  <span class="kw">return new</span> <span class="fn">Ratelimit</span>({
    redis,
    limiter: Ratelimit.<span class="fn">slidingWindow</span>(requests, window),
    analytics: <span class="num">true</span>, <span class="cm">// track in Upstash dashboard</span>
  })
}`,

  assistant: `<span class="cm">// app/api/assistant/route.ts — In-App AI Coaching</span>
<span class="kw">const</span> ASSISTANT_SYSTEM <span class="op">=</span> <span class="st">\`
You are the $100M Sales Team AI Assistant — a synthesis of 8 elite
business frameworks embedded in the user's dashboard.

You have access to this user's analysis history:
\${userHistory}

When coaching:
- Reference their specific analyses by name
- Apply the framework most relevant to their current question
- Ask clarifying questions using Belfort's "trial close" technique
- Suggest upgrading their plan when it unlocks a relevant feature
- Keep responses under 150 words unless asked to elaborate
\`</span>

<span class="cm">// Context-aware: passes last 5 analyses as system context</span>
<span class="cm">// Streaming: real-time coaching appears token-by-token</span>
<span class="cm">// Memory: conversation history stored in sessionStorage</span>`,

  stripe: `<span class="cm">// app/api/webhooks/stripe/route.ts — Billing Events</span>
<span class="kw">export async function</span> <span class="fn">POST</span>(req: Request) {
  <span class="kw">const</span> sig <span class="op">=</span> req.headers.<span class="fn">get</span>(<span class="st">'stripe-signature'</span>)!
  <span class="kw">const</span> body <span class="op">=</span> <span class="kw">await</span> req.<span class="fn">text</span>()

  <span class="cm">// Verify signature — prevents spoofed webhooks</span>
  <span class="kw">const</span> event <span class="op">=</span> stripe.webhooks.<span class="fn">constructEvent</span>(
    body, sig, process.env.STRIPE_WEBHOOK_SECRET!
  )

  <span class="kw">switch</span> (event.type) {
    <span class="kw">case</span> <span class="st">'checkout.session.completed'</span>:
      <span class="kw">await</span> <span class="fn">handleCheckout</span>(event.data.object)
      <span class="kw">break</span>
    <span class="kw">case</span> <span class="st">'customer.subscription.updated'</span>:
      <span class="kw">await</span> <span class="fn">syncTier</span>(event.data.object)   <span class="cm">// updates user.tier in DB</span>
      <span class="kw">break</span>
    <span class="kw">case</span> <span class="st">'customer.subscription.deleted'</span>:
      <span class="kw">await</span> <span class="fn">downgradeToFree</span>(event.data.object)
      <span class="kw">break</span>
  }
  <span class="kw">return</span> <span class="fn">Response</span>.json({ received: <span class="num">true</span> })
}`,
};

const FILE_TREE = `<span class="tree-dir">100m-sales-team/</span>
├── <span class="tree-dir">app/</span>                          <span class="tree-comment"># Next.js 14 App Router</span>
│   ├── <span class="tree-dir">api/</span>
│   │   ├── <span class="tree-dir">analyze/</span>route.ts       <span class="tree-comment"># AI analysis endpoint (streaming)</span>
│   │   ├── <span class="tree-dir">assistant/</span>route.ts     <span class="tree-comment"># AI coaching chatbot</span>
│   │   ├── <span class="tree-dir">webhooks/stripe/</span>route.ts  <span class="tree-comment"># Billing events</span>
│   │   └── <span class="tree-dir">export/pdf/</span>route.ts    <span class="tree-comment"># PDF generation</span>
│   ├── <span class="tree-dir">(auth)/</span>
│   │   ├── <span class="tree-file">login/page.tsx</span>
│   │   └── <span class="tree-file">signup/page.tsx</span>
│   ├── <span class="tree-dir">(dashboard)/</span>
│   │   ├── <span class="tree-file">layout.tsx</span>             <span class="tree-comment"># Auth guard + sidebar</span>
│   │   ├── <span class="tree-file">analyze/page.tsx</span>
│   │   ├── <span class="tree-file">history/page.tsx</span>
│   │   ├── <span class="tree-file">playbooks/page.tsx</span>
│   │   └── <span class="tree-file">settings/page.tsx</span>
│   └── <span class="tree-dir">(marketing)/</span>
│       ├── <span class="tree-file">page.tsx</span>               <span class="tree-comment"># Landing page (Kennedy copy)</span>
│       └── <span class="tree-file">pricing/page.tsx</span>
│
├── <span class="tree-dir">components/</span>
│   ├── <span class="tree-dir">analysis/</span>
│   │   ├── <span class="tree-file">AnalysisInput.tsx</span>
│   │   ├── <span class="tree-file">StreamingResult.tsx</span>    <span class="tree-comment"># SSE streaming display</span>
│   │   ├── <span class="tree-file">FrameworkCard.tsx</span>
│   │   └── <span class="tree-file">ShareCard.tsx</span>          <span class="tree-comment"># OG image for sharing</span>
│   ├── <span class="tree-dir">assistant/</span>
│   │   ├── <span class="tree-file">AssistantPanel.tsx</span>     <span class="tree-comment"># Floating chat sidebar</span>
│   │   └── <span class="tree-file">MessageBubble.tsx</span>
│   ├── <span class="tree-dir">mobile/</span>
│   │   └── <span class="tree-file">BottomNav.tsx</span>          <span class="tree-comment"># Mobile-only nav</span>
│   └── <span class="tree-dir">upgrade/</span>
│       └── <span class="tree-file">UpgradeModal.tsx</span>       <span class="tree-comment"># In-result upgrade prompt</span>
│
├── <span class="tree-dir">lib/</span>
│   ├── <span class="tree-file">ratelimit.ts</span>             <span class="tree-comment"># Upstash Redis rate limiter</span>
│   ├── <span class="tree-file">schemas.ts</span>               <span class="tree-comment"># Zod validation schemas</span>
│   ├── <span class="tree-file">stripe.ts</span>                <span class="tree-comment"># Stripe client + helpers</span>
│   └── <span class="tree-file">ai.ts</span>                    <span class="tree-comment"># Anthropic client + prompts</span>
│
├── <span class="tree-dir">prisma/</span>
│   └── <span class="tree-file">schema.prisma</span>            <span class="tree-comment"># Full DB schema</span>
│
└── <span class="tree-dir">public/</span>
    ├── <span class="tree-file">manifest.json</span>            <span class="tree-comment"># PWA manifest</span>
    └── <span class="tree-file">icons/</span>                   <span class="tree-comment"># App icons (192, 512px)</span>`;

const PROMPTS = [
  {
    label: "Project Bootstrap",
    note: "Run this first. Creates Next.js 14 project with all dependencies pre-configured.",
    text: `Initialize a Next.js 14 App Router SaaS project called "100m-sales-team" with:
- TypeScript strict mode
- Tailwind CSS
- Prisma ORM connected to a Supabase PostgreSQL database
- NextAuth.js with Supabase adapter + Google OAuth + magic links
- Stripe subscription billing with webhooks
- Upstash Redis for rate limiting
- Resend for email
- Sentry for error tracking
- next-pwa for Progressive Web App support
- @anthropic-ai/sdk for AI

Create the full project structure with all config files, environment variable templates (.env.local.example), and a working development setup.`,
  },
  {
    label: "Database Schema",
    note: "Generates schema.prisma with all tables, enums, and RLS policy SQL.",
    text: `Create the complete Prisma schema for a multi-tier SaaS with:
- Users table: id, email, name, stripeCustomerId, tier (FREE/SOLO/PRO/AGENCY/ENTERPRISE), teamId
- Analyses table: id, userId, offerText, analysisType, result (Json), shared, shareToken, createdAt
- Subscriptions table: stripeSubscriptionId, userId, tier, status, currentPeriodEnd
- Teams table: id, name, ownerId, agencyDomain (for white-label)
- AuditLogs table: id, userId, action, metadata, ipAddress, createdAt

Also generate the Supabase SQL migration with Row-Level Security policies ensuring users can only access their own data. Include seed.ts for development data.`,
  },
  {
    label: "AI Analysis API",
    note: "Creates the streaming analysis endpoint with rate limiting and Zod validation baked in.",
    text: `Build the POST /api/analyze route in Next.js App Router with:
1. NextAuth session check (return 401 if not authenticated)
2. Upstash Redis rate limiting based on user's tier from DB (FREE=3/day, SOLO=50/day, PRO=unlimited)
3. Zod schema validation: { offerText: string().max(5000).trim(), analysisType: enum(['offer','problem','challenge']) }
4. Server-side Anthropic streaming call using @anthropic-ai/sdk messages.stream()
5. Return ReadableStream with text/event-stream Content-Type
6. After stream completes, save analysis to Supabase DB (userId, offerText, result JSON)
7. Log to audit_logs table

Include proper error handling for each failure mode. The ANTHROPIC_API_KEY must never be exposed client-side.`,
  },
  {
    label: "AI Assistant",
    note: "Builds the persistent coaching sidebar that knows the user's analysis history.",
    text: `Build a floating AI Assistant panel component that appears on all dashboard pages:
- Renders as a slide-in drawer from the right (desktop) or bottom sheet (mobile < 768px)
- On open, fetches user's last 5 analyses from /api/analyses
- Passes analysis history as context in the system prompt to claude-sonnet-4-20250514
- System prompt: "You are the $100M Sales Team AI coach. The user's recent analyses are: {history}. Coach them using whichever of the 8 frameworks (Hormozi, GaryVee, Cardone, Belfort, Kennedy, Brunson, Godin, Robbins) best applies to their question. Keep responses under 150 words unless asked to elaborate."
- Streams responses using the same SSE pattern as the analyze endpoint
- Stores conversation in sessionStorage (not DB) for privacy
- Shows upgrade prompt when FREE user asks about Pro features`,
  },
  {
    label: "Stripe Billing + Webhooks",
    note: "Full billing infrastructure including Customer Portal and tier enforcement.",
    text: `Implement complete Stripe subscription billing:
1. Create 5 Stripe Products: Free (free), Solo ($49/mo), Pro ($149/mo), Agency ($497/mo), Enterprise ($2497/mo)
2. POST /api/checkout: creates Stripe Checkout Session, redirects to Stripe-hosted page
3. POST /api/webhooks/stripe: handles checkout.session.completed, customer.subscription.updated/deleted, payment_intent.payment_failed
4. Webhook signature verification using stripe.webhooks.constructEvent()
5. Sync user.tier in DB after each billing event
6. GET /api/billing/portal: generates Stripe Customer Portal URL for self-serve plan management
7. Middleware to gate routes: /api/analyze checks user tier before rate-limit check

Add a useSubscription() hook client-side that reads tier from session and shows upgrade prompts.`,
  },
  {
    label: "Mobile PWA",
    note: "Transforms the web app into an installable, offline-capable mobile experience.",
    text: `Configure Progressive Web App support with next-pwa:
1. Generate manifest.json: name, short_name, theme_color (#EA580C), background_color, display: standalone, icons at 192px and 512px
2. Service worker caching strategy: cache-first for static assets, network-first for API routes, stale-while-revalidate for analysis history
3. Offline fallback: show last 10 cached analyses when offline
4. Create BottomNav component: visible only on screens < 768px, fixed bottom, 5 tabs (Analyze, History, Playbooks, Assistant, Settings), uses safe-area-inset-bottom
5. Add viewport meta: width=device-width, initial-scale=1, viewport-fit=cover
6. Add CSS: padding-bottom: env(safe-area-inset-bottom) on bottom nav
7. Add touch event handlers: swipe right to open Assistant drawer on mobile`,
  },
  {
    label: "Security Hardening",
    note: "Locks down every attack vector before launch.",
    text: `Implement production security hardening:
1. next.config.js: add Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy headers
2. Middleware.ts: JWT validation on all /dashboard and /api routes, redirect to /login if invalid
3. All API routes: validate session user matches requested resource userId (IDOR prevention)
4. Zod validation on every API input — no raw req.body usage anywhere
5. Supabase RLS: verify policies exist on all tables — run a test query as a different user to confirm isolation
6. Add CSRF protection for form submissions using Next.js built-in CSRF tokens
7. Rate limit the /api/auth endpoints to prevent brute force: 10 attempts per 15 minutes
8. Add bot detection on signup using Cloudflare Turnstile (free tier)
9. Generate audit log entry for every sensitive action`,
  },
  {
    label: "Growth Systems",
    note: "Automates the Soap Opera Sequence, referrals, and viral sharing from day one.",
    text: `Build automated growth infrastructure:
1. Resend email sequences triggered on signup:
   - Day 0: Welcome + first analysis prompt (Hook)
   - Day 1: Framework story email (Story)
   - Day 3: Case study — "How [customer] used Hormozi framework to 3x conversions" (Proof)
   - Day 5: Objection handling — address "I already have a consultant" (Belfort)
   - Day 7: Hard upgrade CTA with deadline — "Founding Pro pricing expires in 48 hours" (Kennedy)
2. Shareable analysis cards: route /share/[shareToken] renders a public view of analysis, OG image generated with @vercel/og
3. Referral system: generate unique referral link per user, track conversions in Supabase, credit 30% of first 12 months to referrer in Stripe
4. Weekly digest email: user's analysis count, framework score trends, upgrade prompt if on Free`,
  },
];

/* ── TABS ── */
const TABS = [
  { id: "overview",  label: "Overview",      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "stack",     label: "Tech Stack",    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { id: "backend",   label: "Backend Code",  icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "security",  label: "Security",      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { id: "mobile",    label: "Mobile / PWA",  icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { id: "prompts",   label: "Claude Code",   icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
  { id: "roadmap",   label: "Roadmap",       icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
];

export default function BuildPlan() {
  const [tab, setTab] = useState("overview");
  const [copied, setCopied] = useState(null);

  const copy = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id); setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* TOP BAR */}
        <div className="tb">
          <div className="tb-logo">
            <div className="tb-icon">$</div>
            $100M Sales Team
          </div>
          <div className="tb-div" />
          <span className="tb-sub">Claude Code Build Plan</span>
          <div className="tb-sp" />
          <span className="tb-tag">Next.js · Supabase · Stripe · Claude API · PWA</span>
        </div>

        {/* NAV */}
        <div className="nav">
          {TABS.map(t => (
            <button key={t.id} className={`nt${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
              {t.label}
            </button>
          ))}
        </div>

        <div className="main">

          {/* ══ OVERVIEW ══ */}
          {tab === "overview" && (
            <div className="col">
              <div className="ph">
                <div className="ph-title">Claude Code Build Plan</div>
                <div className="ph-desc">A complete technical specification to ship the $100M AI Sales Team as a production SaaS — built backend-first, secured at every layer, mobile-ready from day one, and optimized through all 8 frameworks.</div>
                <div className="ph-meta">
                  {[
                    { val:"4 wks", lbl:"MVP to Launch",   color:"var(--acc)"    },
                    { val:"1 dev", lbl:"Tiny Team Build",  color:"var(--blue)"   },
                    { val:"8",     lbl:"Security Layers",  color:"var(--red)"    },
                    { val:"PWA",   lbl:"Mobile First",     color:"var(--green)"  },
                  ].map((s,i) => (
                    <div key={i} style={{ display:"flex",flexDirection:"column",gap:".15rem" }}>
                      <div className="pm-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="pm-lbl">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sl">Architecture Overview</div>
              <div className="g3">
                {[
                  { t:"Frontend",   d:"Next.js 14 App Router — React Server Components for instant loads, Client Components for interactivity. One codebase for desktop and mobile PWA.", c:"var(--blue)"   },
                  { t:"Backend API",d:"Next.js API Routes — server-side AI calls, Stripe webhook handlers, Supabase queries. All secured behind NextAuth session checks.", c:"var(--green)"  },
                  { t:"Database",   d:"Supabase PostgreSQL with Prisma ORM — Row-Level Security means users can never access each other's data, even via direct DB queries.", c:"var(--purple)" },
                  { t:"AI Engine",  d:"Anthropic claude-sonnet-4-20250514 — API key lives server-side only. Streaming responses via ReadableStream. Per-tier rate limiting via Redis.", c:"var(--acc)"    },
                  { t:"Billing",    d:"Stripe Subscriptions — webhook-driven tier syncing, Customer Portal for self-serve management, metered usage for Agency API tier.", c:"#635BFF"       },
                  { t:"Mobile",     d:"next-pwa Service Worker — installable to home screen, offline analysis cache, bottom navigation, safe-area insets, haptic feedback.", c:"var(--cyan)"   },
                ].map((c,i) => (
                  <div key={i} className={`card d${i+1}`} style={{ borderLeft:`3px solid ${c.c}` }}>
                    <div className="ct" style={{ color: c.c }}>{c.t}</div>
                    <div className="cb">{c.d}</div>
                  </div>
                ))}
              </div>

              <div className="sl">Framework-Optimized Build Decisions</div>
              <Anno expert="Hormozi" text="Build only what delivers the core value equation first: the AI analysis + billing. Don't add team features, agency portals, or integrations until the core loop is proven. The minimum viable offer is a working analysis API with Stripe — ship that in week one." />
              <Anno expert="Brunson" text="Every screen is a funnel step. The analysis result page is the highest-intent moment — the upgrade modal lives there, not on a pricing page. Build the in-result OTO (one-time offer) in week three alongside the frontend." />
              <Anno expert="Cardone" text="10x the shipping speed. One developer with Claude Code can ship what used to take a 5-person team. Daily standard: commit working code every single day. No perfect — ship it, iterate fast." />
              <Anno expert="Godin" text="Position the architecture to be remarkable: streaming AI analysis that appears token-by-token is visually distinctive. Build the streaming experience first — it's the moment users become believers." />
              <Anno expert="Belfort" text="Handle the biggest technical objection upfront: 'Is my data safe?' Build RLS and audit logging in week one, before any features. Security-first architecture becomes a sales argument, not a footnote." />
              <Anno expert="Kennedy" text="The landing page is the first conversion point. Backend must be ready before marketing starts — every click needs to land on a working product. Database and auth in week one; landing page copy goes live in week two." />
              <Anno expert="GaryVee" text="Build shareability into the data model from day one: every Analysis gets a shareToken and a /share/[token] public route. Viral sharing is a schema decision, not an afterthought feature." />
              <Anno expert="Robbins" text="Set non-negotiable build standards: every PR has tests, every API route has error handling, every commit has a passing lint check. Standards in the CI/CD pipeline ensure the product doesn't rot as you scale." />
            </div>
          )}

          {/* ══ TECH STACK ══ */}
          {tab === "stack" && (
            <div className="col">
              <div className="ph">
                <div className="ph-title">Technology Stack</div>
                <div className="ph-desc">Every choice made for a single developer to build a production-grade SaaS in 4 weeks. Opinioned, integrated, and battle-tested. No over-engineering.</div>
              </div>

              <div className="sl">Stack Decisions</div>
              <div className="g2">
                {STACK.map((s,i) => (
                  <div key={i} className={`stack-card d${(i%6)+1}`} style={{"--sc":s.color}}>
                    <div className="sc-layer">{s.layer}</div>
                    <div className="sc-tech">{s.tech}</div>
                    <div className="sc-why">{s.why}</div>
                    <div className="sc-tags">
                      {s.tags.map((tag,j) => (
                        <span key={j} className="tag" style={{background:`${s.color}12`,color:s.color,border:`1px solid ${s.color}28`}}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sl">Environment Variables Required</div>
              <CodeBlock filename=".env.local.example" copied={copied==="env"} onCopy={()=>copy("env","")}>
                {`<span class="cm"># Supabase</span>
DATABASE_URL<span class="op">=</span>postgresql://...
NEXT_PUBLIC_SUPABASE_URL<span class="op">=</span>https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY<span class="op">=</span>eyJ...
SUPABASE_SERVICE_ROLE_KEY<span class="op">=</span>eyJ...   <span class="cm"># server-only</span>

<span class="cm"># Auth (Google OAuth)</span>
NEXTAUTH_SECRET<span class="op">=</span>$(openssl rand -base64 32)
NEXTAUTH_URL<span class="op">=</span>http://localhost:3000
GOOGLE_CLIENT_ID<span class="op">=</span>xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET<span class="op">=</span>xxx

<span class="cm"># ⚠️  CRITICAL: Never prefix with NEXT_PUBLIC_</span>
<span class="cm">#    This key must NEVER reach the browser</span>
ANTHROPIC_API_KEY<span class="op">=</span>sk-ant-...

<span class="cm"># Stripe</span>
STRIPE_SECRET_KEY<span class="op">=</span>sk_live_...
STRIPE_WEBHOOK_SECRET<span class="op">=</span>whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY<span class="op">=</span>pk_live_...

<span class="cm"># Upstash Redis (rate limiting)</span>
UPSTASH_REDIS_REST_URL<span class="op">=</span>https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN<span class="op">=</span>xxx`}
              </CodeBlock>

              <div className="sl">Project File Structure</div>
              <div className="tree" dangerouslySetInnerHTML={{ __html: FILE_TREE }} />
            </div>
          )}

          {/* ══ BACKEND CODE ══ */}
          {tab === "backend" && (
            <div className="col">
              <div className="ph">
                <div className="ph-title">Backend Code</div>
                <div className="ph-desc">Production-ready code samples for every critical backend system — database schema, AI streaming, billing, and the AI assistant. Copy directly into Claude Code.</div>
              </div>

              <div className="sl">Database Schema (Prisma)</div>
              <CodeBlock filename="prisma/schema.prisma" copied={copied==="schema"} onCopy={()=>copy("schema","")}>{CODE_SAMPLES.schema}</CodeBlock>

              <div className="sl">AI Analysis Endpoint (Streaming)</div>
              <CodeBlock filename="app/api/analyze/route.ts" copied={copied==="analyze"} onCopy={()=>copy("analyze","")}>{CODE_SAMPLES.analyze}</CodeBlock>

              <div className="sl">Per-Tier Rate Limiting</div>
              <CodeBlock filename="lib/ratelimit.ts" copied={copied==="rl"} onCopy={()=>copy("rl","")}>{CODE_SAMPLES.ratelimit}</CodeBlock>

              <div className="sl">AI Assistant — Context-Aware Coaching</div>
              <CodeBlock filename="app/api/assistant/route.ts" copied={copied==="asst"} onCopy={()=>copy("asst","")}>{CODE_SAMPLES.assistant}</CodeBlock>

              <div className="sl">Stripe Webhook Handler</div>
              <CodeBlock filename="app/api/webhooks/stripe/route.ts" copied={copied==="stripe"} onCopy={()=>copy("stripe","")}>{CODE_SAMPLES.stripe}</CodeBlock>

              <Anno expert="Belfort" text="The objection 'your AI product is insecure' is killed before it's asked. Every endpoint: auth check → rate limit → Zod validate → process. This order is non-negotiable. Skipping any step is a security vulnerability." />
              <Anno expert="Hormozi" text="The AI assistant is the highest-value feature per dollar of build time. It takes the same Anthropic API call and adds coaching context. The marginal cost is near zero; the perceived value increase is 10×." />
            </div>
          )}

          {/* ══ SECURITY ══ */}
          {tab === "security" && (
            <div className="col">
              <div className="ph">
                <div className="ph-title">Security Architecture</div>
                <div className="ph-desc">Eight layered security controls — built before any features ship. Security is a sales argument for enterprise buyers and a legal requirement for handling payment data. Non-negotiable.</div>
              </div>

              <div className="kpis">
                {[
                  { l:"Attack Vectors", v:"8",     s:"All mitigated at architecture level", c:"var(--red)"   },
                  { l:"Auth Method",    v:"JWT",    s:"HttpOnly cookies, server-side",       c:"var(--blue)"  },
                  { l:"DB Isolation",  v:"RLS",    s:"Row-Level Security via Supabase",      c:"var(--green)" },
                  { l:"API Key",       v:"Server", s:"Never exposed to browser bundle",      c:"var(--acc)"   },
                ].map((k,i) => (
                  <div key={i} className={`kpi d${i+1}`} style={{"--kc":k.c}}>
                    <div className="kpi-l">{k.l}</div>
                    <div className="kpi-v">{k.v}</div>
                    <div className="kpi-s">{k.s}</div>
                  </div>
                ))}
              </div>

              <div className="sl">Security Controls</div>
              <div className="col">
                {SECURITY.map((s,i) => (
                  <div key={i} className={`sec-item d${(i%6)+1}`}>
                    <div className="sec-icon" style={{background:"var(--red-lt)"}}>{s.icon}</div>
                    <div className="sec-body">
                      <div className="sec-name">{s.name}</div>
                      <div className="sec-desc">{s.desc}</div>
                      <div className="sec-impl">{s.impl}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sl">Security Middleware</div>
              <CodeBlock filename="middleware.ts" copied={copied==="mw"} onCopy={()=>copy("mw","")}>{`<span class="cm">// middleware.ts — Runs on every request at Edge</span>
<span class="kw">import</span> { withAuth } <span class="kw">from</span> <span class="st">'next-auth/middleware'</span>
<span class="kw">import</span> { NextResponse } <span class="kw">from</span> <span class="st">'next/server'</span>

<span class="kw">export default</span> <span class="fn">withAuth</span>(
  <span class="kw">function</span> <span class="fn">middleware</span>(req) {
    <span class="kw">const</span> res <span class="op">=</span> NextResponse.<span class="fn">next</span>()
    res.headers.<span class="fn">set</span>(<span class="st">'X-Frame-Options'</span>, <span class="st">'DENY'</span>)
    res.headers.<span class="fn">set</span>(<span class="st">'X-Content-Type-Options'</span>, <span class="st">'nosniff'</span>)
    res.headers.<span class="fn">set</span>(<span class="st">'Referrer-Policy'</span>, <span class="st">'strict-origin-when-cross-origin'</span>)
    res.headers.<span class="fn">set</span>(<span class="st">'Permissions-Policy'</span>, <span class="st">'camera=(), microphone=(), geolocation=()'</span>)
    res.headers.<span class="fn">set</span>(<span class="st">'Content-Security-Policy'</span>,
      <span class="st">"default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src 'self' *.anthropic.com *.supabase.co"</span>
    )
    <span class="kw">return</span> res
  },
  { callbacks: { authorized: ({ token }) <span class="op">=></span> !!token } }
)

<span class="kw">export const</span> config <span class="op">=</span> {
  matcher: [<span class="st">'/dashboard/:path*'</span>, <span class="st">'/api/analyze'</span>, <span class="st">'/api/assistant'</span>]
}`}</CodeBlock>
              <Anno expert="Belfort" text="Ship security first, features second. When an enterprise buyer asks 'Is our data isolated from other customers?' you answer: 'Yes — Postgres Row-Level Security enforced at the database layer, not application layer. Zero code path can bypass it.' That closes the deal." />
            </div>
          )}

          {/* ══ MOBILE ══ */}
          {tab === "mobile" && (
            <div className="col">
              <div className="ph">
                <div className="ph-title">Mobile / PWA Strategy</div>
                <div className="ph-desc">Mobile-first isn't a design choice — it's a distribution strategy. An installable PWA reaches users where they work: on their phones between sales calls. No App Store approval, no separate codebase.</div>
              </div>

              <div className="sl">Mobile Checklist</div>
              <div className="g2">
                {MOBILE.map((m,i) => (
                  <div key={i} className={`mob-item d${(i%6)+1}`}>
                    <div className="mob-check" style={{background:`${m.color}15`,color:m.color}}>✓</div>
                    <div className="mob-info">
                      <div className="mob-name">{m.label}</div>
                      <div className="mob-desc">{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sl">Bottom Navigation Component</div>
              <CodeBlock filename="components/mobile/BottomNav.tsx" copied={copied==="bn"} onCopy={()=>copy("bn","")}>{`<span class="cm">// Only renders on mobile viewport (< 768px)</span>
<span class="kw">const</span> NAV_ITEMS <span class="op">=</span> [
  { href: <span class="st">'/dashboard/analyze'</span>,  icon: <span class="st">'⚡'</span>, label: <span class="st">'Analyze'</span>   },
  { href: <span class="st">'/dashboard/history'</span>,  icon: <span class="st">'📋'</span>, label: <span class="st">'History'</span>   },
  { href: <span class="st">'/dashboard/playbooks'</span>,icon: <span class="st">'📚'</span>, label: <span class="st">'Playbooks'</span> },
  { href: <span class="st">'/dashboard/assistant'</span>,icon: <span class="st">'🤖'</span>, label: <span class="st">'Coach'</span>     },
  { href: <span class="st">'/dashboard/settings'</span>, icon: <span class="st">'⚙️'</span>,  label: <span class="st">'Settings'</span>  },
]

<span class="kw">export function</span> <span class="fn">BottomNav</span>() {
  <span class="kw">return</span> (
    &lt;<span class="fn">nav</span> style={{
      position: <span class="st">'fixed'</span>, bottom: <span class="num">0</span>, left: <span class="num">0</span>, right: <span class="num">0</span>,
      background: <span class="st">'white'</span>, borderTop: <span class="st">'1px solid #E5E7EB'</span>,
      paddingBottom: <span class="st">'env(safe-area-inset-bottom)'</span>,
      display: <span class="st">'flex'</span>, justifyContent: <span class="st">'space-around'</span>,
    }} className<span class="op">=</span><span class="st">"md:hidden"</span>&gt;
      {NAV_ITEMS.<span class="fn">map</span>(item <span class="op">=></span> (
        &lt;<span class="fn">Link</span> key<span class="op">=</span>{item.href} href<span class="op">=</span>{item.href}
          onClick<span class="op">=</span>{() <span class="op">=></span> navigator.<span class="fn">vibrate</span>?.(<span class="num">10</span>)}
        &gt;
          {item.icon} &lt;<span class="fn">span</span>&gt;{item.label}&lt;/span&gt;
        &lt;/Link&gt;
      ))}
    &lt;/nav&gt;
  )
}`}</CodeBlock>

              <div className="sl">PWA Manifest</div>
              <CodeBlock filename="public/manifest.json" copied={copied==="manifest"} onCopy={()=>copy("manifest","")}>{`{
  <span class="st">"name"</span>: <span class="st">"$100M Sales Team"</span>,
  <span class="st">"short_name"</span>: <span class="st">"$100M"</span>,
  <span class="st">"description"</span>: <span class="st">"8 expert frameworks. One integrated strategy."</span>,
  <span class="st">"theme_color"</span>: <span class="st">"#EA580C"</span>,
  <span class="st">"background_color"</span>: <span class="st">"#F7F6F3"</span>,
  <span class="st">"display"</span>: <span class="st">"standalone"</span>,
  <span class="st">"orientation"</span>: <span class="st">"portrait"</span>,
  <span class="st">"start_url"</span>: <span class="st">"/dashboard/analyze"</span>,
  <span class="st">"icons"</span>: [
    { <span class="st">"src"</span>: <span class="st">"/icons/192.png"</span>, <span class="st">"sizes"</span>: <span class="st">"192x192"</span>, <span class="st">"type"</span>: <span class="st">"image/png"</span> },
    { <span class="st">"src"</span>: <span class="st">"/icons/512.png"</span>, <span class="st">"sizes"</span>: <span class="st">"512x512"</span>, <span class="st">"type"</span>: <span class="st">"image/png"</span>,
      <span class="st">"purpose"</span>: <span class="st">"any maskable"</span> }
  ]
}`}</CodeBlock>
              <Anno expert="GaryVee" text="PWA install = owned traffic. Every user who installs to home screen is a push notification subscriber, a repeat visitor, and a distribution channel. Build the 'Add to Home Screen' prompt as a feature, not an afterthought — trigger it after the first successful analysis." />
            </div>
          )}

          {/* ══ CLAUDE CODE PROMPTS ══ */}
          {tab === "prompts" && (
            <div className="col">
              <div className="ph">
                <div className="ph-title">Claude Code Prompts</div>
                <div className="ph-desc">Copy these directly into Claude Code. Each prompt is engineered to generate production-ready code in a single pass — specific enough to work, open enough to fit your exact setup.</div>
              </div>

              <div className="sl">Build Order (Run in Sequence)</div>
              <div className="col">
                {PROMPTS.map((p,i) => (
                  <Prompt key={i} label={p.label} note={p.note}>{p.text}</Prompt>
                ))}
              </div>

              <div className="sl">CI/CD GitHub Actions</div>
              <CodeBlock filename=".github/workflows/ci.yml" copied={copied==="ci"} onCopy={()=>copy("ci","")}>{`<span class="kw">name</span>: CI
<span class="kw">on</span>: [push, pull_request]

<span class="kw">jobs</span>:
  <span class="kw">build</span>:
    <span class="kw">runs-on</span>: ubuntu-latest
    <span class="kw">steps</span>:
      - <span class="kw">uses</span>: actions/checkout@v4
      - <span class="kw">uses</span>: actions/setup-node@v4
        <span class="kw">with</span>: { node-version: <span class="st">'20'</span> }
      - <span class="kw">run</span>: npm ci
      - <span class="kw">run</span>: npm run lint       <span class="cm"># ESLint + TypeScript check</span>
      - <span class="kw">run</span>: npm run test       <span class="cm"># Vitest unit tests</span>
      - <span class="kw">run</span>: npm run build      <span class="cm"># Vercel build check</span>
      - <span class="kw">run</span>: npx prisma validate <span class="cm"># Schema validation</span>`}</CodeBlock>

              <Anno expert="Robbins" text="The CI/CD pipeline is your daily execution standard made automatic. Every commit runs lint + tests + build. A team that ships broken code has no standard — the pipeline enforces the standard without relying on willpower. Set it up in hour one." />
              <Anno expert="Cardone" text="10x the output: Claude Code can write an entire API route, with tests and types, in 60 seconds. That's 10x the developer velocity. Set a daily commit standard: at least one shippable feature per day. With Claude Code, this is achievable solo." />
            </div>
          )}

          {/* ══ ROADMAP ══ */}
          {tab === "roadmap" && (
            <div className="col">
              <div className="ph">
                <div className="ph-title">4-Week Build Roadmap</div>
                <div className="ph-desc">Backend-first. Security before features. Revenue infrastructure before UI. This order is not arbitrary — it's the Hormozi principle: build the offer (AI engine + billing) before the audience (marketing).</div>
              </div>

              <div className="kpis">
                {[
                  { l:"Week 1 Deliverable", v:"Auth + DB",   s:"Users can sign up and log in", c:"var(--blue)"   },
                  { l:"Week 2 Deliverable", v:"AI + Stripe", s:"Analyses work, payments flow",  c:"var(--acc)"    },
                  { l:"Week 3 Deliverable", v:"UI + PWA",    s:"Full dashboard, installable",    c:"var(--purple)" },
                  { l:"Week 4 Deliverable", v:"Assistant",   s:"AI coach + agency features",     c:"var(--green)"  },
                ].map((k,i) => (
                  <div key={i} className={`kpi d${i+1}`} style={{"--kc":k.c}}>
                    <div className="kpi-l">{k.l}</div>
                    <div className="kpi-v">{k.v}</div>
                    <div className="kpi-s">{k.s}</div>
                  </div>
                ))}
              </div>

              <div className="sl">Phase Breakdown</div>
              <div className="col">
                {PHASES.map((p,i) => (
                  <div key={i} className={`phase d${i+1}`}>
                    <div className="phase-h">
                      <div className="phase-n">{p.n}</div>
                      <div className="phase-info">
                        <div className="phase-period">{p.period}</div>
                        <div className="phase-title">{p.title}</div>
                      </div>
                      <span className="phase-badge" style={Object.fromEntries(p.badgeStyle.split(";").filter(Boolean).map(s=>{const[k,v]=s.split(":").map(x=>x.trim());return[k.replace(/-([a-z])/g,(_,l)=>l.toUpperCase()),v]}))}>{p.badge}</span>
                    </div>
                    <div className="phase-body">
                      {p.tracks.map((tr,j) => (
                        <div key={j}>
                          <div className="phase-track-lbl">{tr.lbl}</div>
                          <div className="phase-items">
                            {tr.items.map((item,k) => (
                              <div key={k} className="phase-item">
                                <span className="phase-dot" />
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sl">Launch Criteria (Robbins Standards)</div>
              <div className="g2">
                {[
                  { t:"Backend Standard",  d:"Every API route has: auth check, rate limit, Zod validation, error handling, audit log. Zero exceptions. Claude Code reviews each route against this checklist.", c:"var(--acc)"   },
                  { t:"Security Standard", d:"RLS policies tested with a second test user. API key verified as server-only (grep for ANTHROPIC in client bundle — must return zero results).", c:"var(--red)"    },
                  { t:"Mobile Standard",   d:"Lighthouse PWA score ≥ 90. Bottom nav renders on iPhone SE (375px). Safe area insets verified on notched device. First analysis on mobile < 3 seconds.", c:"var(--blue)"   },
                  { t:"Revenue Standard",  d:"Stripe webhook tested end-to-end in test mode: upgrade, downgrade, cancellation. Customer Portal functional. Tier enforcement verified by attempting to exceed Free limit.", c:"var(--green)"  },
                ].map((c,i) => (
                  <div key={i} className={`card d${i+1}`} style={{borderLeft:`3px solid ${c.c}`}}>
                    <div className="ct" style={{color:c.c}}>{c.t}</div>
                    <div className="cb">{c.d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
