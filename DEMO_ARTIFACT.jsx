/**
 * AI Automation Platform — Interactive Demo
 *
 * Paste the contents of this file into a Claude.ai chat and ask:
 * "Render this as an interactive artifact"
 *
 * Demo flow:
 *   1. Click ▶ Run on any automation
 *   2. Watch AI "generate" content (animated)
 *   3. Get redirected to Content Queue automatically
 *   4. Approve or reject the new content item
 */

import { useState, useEffect } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const c = {
  base: "#0A0B0F", surface: "#0D0E14", elevated: "#111318", overlay: "#151820",
  border: "#1E2330", t1: "#F1F5F9", t2: "#94A3B8", t3: "#64748B",
  amber: "#F59E0B", cyan: "#06B6D4", green: "#10B981", red: "#EF4444",
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const AUTOMATIONS = [
  { id: 1, name: "Daily Twitter Insights", platform: "twitter", schedule: "Daily at 9:00 AM", status: "active", lastRun: "2 hours ago" },
  { id: 2, name: "LinkedIn Thought Leadership", platform: "linkedin", schedule: "Mon / Wed / Fri at 8:00 AM", status: "active", lastRun: "Yesterday" },
  { id: 3, name: "Gmail Support Auto-Reply", platform: "gmail", schedule: "Every 2 hours", status: "paused", lastRun: "3 days ago" },
  { id: 4, name: "HubSpot Lead Nurture", platform: "hubspot", schedule: "Daily at 10:00 AM", status: "active", lastRun: "1 hour ago" },
  { id: 5, name: "Facebook Brand Update", platform: "facebook", schedule: "Tue / Thu at 2:00 PM", status: "active", lastRun: "Yesterday" },
];

const GENERATED_POSTS = {
  twitter: "AI is transforming how marketing teams operate. 73% of marketers report saving 5+ hours per week with automation. The future isn't replacing creativity — it's amplifying it. 🚀 #AI #Marketing #Automation",
  linkedin: "Thought leadership isn't about having all the answers — it's about asking better questions. This week we challenged our entire content strategy and discovered 3 opportunities we'd been overlooking for months. What assumptions is your team ready to question?",
  gmail: "Hi [Customer], thank you for reaching out! Our team has reviewed your request and I'm happy to help. Based on your account details, here's what I recommend as next steps...",
  hubspot: "New lead enriched: Sarah Mitchell, VP Marketing @ TechCorp — 3 recent website visits, downloaded pricing guide, opened last 4 emails. Recommended action: Schedule discovery call within 24h.",
  facebook: "We believe every brand has a story worth telling. Today we're sharing ours — how we grew from a small team with big ideas to a platform that helps hundreds of businesses automate their voice. What's your brand's story?",
};

const INITIAL_CONTENT = [
  { id: 1, platform: "twitter", status: "pending_approval", text: "The best marketing automation isn't magic — it's systems. Build the right systems and let results compound. Start small, iterate fast. #Growth", automation: "Daily Twitter Insights", age: "10 min ago" },
  { id: 2, platform: "linkedin", status: "pending_approval", text: "Five years ago we had zero automation. Today, 80% of our routine content is AI-assisted — but 100% of our creative direction is still human. That balance is everything.", automation: "LinkedIn Thought Leadership", age: "2 hours ago" },
  { id: 3, platform: "facebook", status: "published", text: "Exciting announcement: our platform now supports 8 social platforms. One dashboard, full control.", automation: "Facebook Brand Update", age: "2 days ago" },
];

const INTEGRATIONS = [
  { id: "twitter", name: "Twitter / X", handle: "@yourbrand", status: "active" },
  { id: "linkedin", name: "LinkedIn", handle: "XMiL Research Corp", status: "active" },
  { id: "facebook", name: "Facebook", handle: "XMiL Research Page", status: "active" },
  { id: "instagram", name: "Instagram", handle: "Pending Meta review", status: "expiring" },
  { id: "gmail", name: "Gmail", handle: "team@xmilresearch.com", status: "active" },
  { id: "hubspot", name: "HubSpot", handle: "Main CRM workspace", status: "active" },
  { id: "tiktok", name: "TikTok", handle: "Awaiting API approval", status: "error" },
  { id: "sendgrid", name: "SendGrid", handle: "Not connected", status: "inactive" },
];

const PLATFORM = {
  twitter:   { color: "#1DA1F2", bg: "#1DA1F215", sym: "𝕏" },
  linkedin:  { color: "#0077B5", bg: "#0077B515", sym: "in" },
  gmail:     { color: "#EA4335", bg: "#EA433515", sym: "G" },
  facebook:  { color: "#1877F2", bg: "#1877F215", sym: "f" },
  instagram: { color: "#E1306C", bg: "#E1306C15", sym: "◎" },
  hubspot:   { color: "#FF7A59", bg: "#FF7A5915", sym: "H" },
  tiktok:    { color: "#69C9D0", bg: "#69C9D015", sym: "♪" },
  sendgrid:  { color: "#1A82E2", bg: "#1A82E215", sym: "S" },
};

function Badge({ status }) {
  const map = {
    active:           { bg: "#10B98122", color: "#10B981", label: "Active" },
    paused:           { bg: "#64748B22", color: "#64748B", label: "Paused" },
    pending_approval: { bg: "#F59E0B22", color: "#F59E0B", label: "Pending" },
    approved:         { bg: "#06B6D422", color: "#06B6D4", label: "Approved" },
    published:        { bg: "#10B98122", color: "#10B981", label: "Published" },
    expiring:         { bg: "#F59E0B22", color: "#F59E0B", label: "Needs attention" },
    error:            { bg: "#EF444422", color: "#EF4444", label: "Error" },
    inactive:         { bg: "#64748B22", color: "#64748B", label: "Not connected" },
  };
  const s = map[status] || map.inactive;
  return <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: "monospace" }}>{s.label}</span>;
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
  const bg = type === "error" ? c.red : type === "info" ? c.cyan : c.green;
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, background: bg, color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,.5)", maxWidth: 320, animation: "fadeUp .2s ease" }}>
      {msg}
    </div>
  );
}

const NAV = [
  { id: "automations", label: "Automations", icon: "⚡" },
  { id: "content",     label: "Content Queue", icon: "📋", hasBadge: true },
  { id: "analytics",  label: "Analytics",     icon: "📊" },
  { id: "integrations",label:"Integrations",  icon: "🔗" },
  { id: "audit",       label: "Audit Log",    icon: "🛡" },
  { id: "settings",    label: "Settings",     icon: "⚙" },
];

function Sidebar({ active, go, pending }) {
  return (
    <div style={{ width: 216, flexShrink: 0, background: c.surface, borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, background: c.amber, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#000" }}>A</div>
          <span style={{ color: c.t1, fontWeight: 700, fontSize: 15, letterSpacing: "-.3px" }}>Automate</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: c.t3, fontFamily: "monospace" }}>XMiL Research Corp</div>
      </div>
      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
        {NAV.map(n => {
          const on = active === n.id;
          return (
            <button key={n.id} onClick={() => go(n.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", background: on ? `${c.amber}18` : "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: on ? c.amber : c.t2, width: "100%", textAlign: "left", fontSize: 13, fontWeight: on ? 600 : 400, position: "relative" }}>
              {on && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 2, height: 16, background: c.amber, borderRadius: 1 }} />}
              <span style={{ fontSize: 13 }}>{n.icon}</span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.hasBadge && pending > 0 && <span style={{ background: c.amber, color: "#000", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 700, fontFamily: "monospace" }}>{pending}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 28, height: 28, background: `${c.amber}25`, border: `1px solid ${c.amber}55`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: c.amber, fontWeight: 700 }}>XM</div>
        <div>
          <div style={{ fontSize: 12, color: c.t1, fontWeight: 600 }}>Admin</div>
          <div style={{ fontSize: 10, color: c.t3, fontFamily: "monospace" }}>XMiLResearch@gmail.com</div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ page }) {
  const labels = { automations: "Automations", content: "Content Queue", analytics: "Analytics", integrations: "Integrations", audit: "Audit Log", settings: "Settings" };
  return (
    <div style={{ height: 52, background: c.surface, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", flexShrink: 0 }}>
      <span style={{ color: c.t1, fontSize: 15, fontWeight: 700 }}>{labels[page]}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: c.elevated, border: `1px solid ${c.border}`, borderRadius: 20, padding: "3px 11px", fontSize: 11, color: c.t2 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.green, animation: "pulse 2s infinite" }} />
          4 connected
        </div>
        <div style={{ width: 30, height: 30, background: c.elevated, border: `1px solid ${c.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13 }}>🔔</div>
      </div>
    </div>
  );
}

function AutomationsPage({ onRun }) {
  const [autos, setAutos] = useState(AUTOMATIONS);
  const [running, setRunning] = useState(null);
  const run = (a) => {
    if (a.status === "paused") return;
    setRunning(a.id);
    setTimeout(() => { setRunning(null); onRun(a); }, 1900);
  };
  const toggle = (id) => setAutos(p => p.map(a => a.id === id ? { ...a, status: a.status === "active" ? "paused" : "active" } : a));
  return (
    <div style={{ padding: 22 }}>
      <div style={{ background: `${c.amber}10`, border: `1px solid ${c.amber}30`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: c.amber, display: "flex", alignItems: "center", gap: 8 }}>
        <span>💡</span>
        <span>Click <strong>▶ Run</strong> on any automation to generate AI content and see the full workflow in action.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Total Automations", value: "5", sub: "4 active · 1 paused" },
          { label: "Runs Today", value: "2", sub: "↑ 1 from yesterday", vc: c.cyan },
          { label: "Published This Week", value: "14", sub: "Across 3 platforms", vc: c.green },
        ].map(k => (
          <div key={k.label} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, color: c.t3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.vc || c.t1, fontFamily: "monospace", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: c.t3, marginTop: 5 }}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {autos.map(a => {
          const p = PLATFORM[a.platform] || PLATFORM.twitter;
          const isRun = running === a.id;
          return (
            <div key={a.id} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 34, height: 34, background: p.bg, border: `1px solid ${p.color}30`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: p.color, fontWeight: 700, flexShrink: 0 }}>{p.sym}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ color: c.t1, fontSize: 13, fontWeight: 600 }}>{a.name}</span>
                  <Badge status={a.status} />
                </div>
                <div style={{ fontSize: 11, color: c.t3, fontFamily: "monospace" }}>{a.schedule} · Last run: {a.lastRun}</div>
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => run(a)} disabled={isRun || a.status === "paused"} style={{ background: isRun ? `${c.amber}25` : `${c.amber}18`, border: `1px solid ${c.amber}40`, color: c.amber, padding: "5px 13px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: a.status === "paused" ? "not-allowed" : "pointer", opacity: a.status === "paused" ? 0.4 : 1, display: "flex", alignItems: "center", gap: 5, minWidth: 80, justifyContent: "center" }}>
                  {isRun ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Running</> : "▶ Run"}
                </button>
                <button onClick={() => toggle(a.id)} style={{ background: "transparent", border: `1px solid ${c.border}`, color: c.t2, padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                  {a.status === "active" ? "Pause" : "Resume"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContentPage({ items, onApprove, onReject }) {
  const [tab, setTab] = useState("pending_approval");
  const tabs = [
    { id: "pending_approval", label: "Pending", count: items.filter(i => i.status === "pending_approval").length },
    { id: "approved",  label: "Approved",  count: items.filter(i => i.status === "approved").length },
    { id: "published", label: "Published", count: items.filter(i => i.status === "published").length },
  ];
  const visible = items.filter(i => i.status === tab);
  return (
    <div style={{ padding: 22 }}>
      <div style={{ display: "flex", gap: 3, marginBottom: 18, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: 3, width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "5px 14px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: tab === t.id ? c.elevated : "transparent", color: tab === t.id ? c.t1 : c.t3, display: "flex", alignItems: "center", gap: 5 }}>
            {t.label}
            {t.count > 0 && <span style={{ background: tab === t.id ? c.amber : c.t3, color: tab === t.id ? "#000" : c.base, borderRadius: 8, padding: "0 5px", fontSize: 10, fontWeight: 700 }}>{t.count}</span>}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: c.t3 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
          <div style={{ fontSize: 13 }}>Nothing here yet</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visible.map(item => {
            const p = PLATFORM[item.platform] || PLATFORM.twitter;
            return (
              <div key={item.id} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: 16, animation: "fadeUp .3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, background: p.bg, border: `1px solid ${p.color}35`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: p.color, fontWeight: 700 }}>{p.sym}</div>
                  <span style={{ fontSize: 12, color: c.t2 }}>{p.label || item.platform}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: c.t3 }}>{item.automation} · {item.age}</span>
                </div>
                <div style={{ color: c.t1, fontSize: 13, lineHeight: 1.65, margin: "0 0 12px", padding: 12, background: c.elevated, borderRadius: 6, border: `1px solid ${c.border}` }}>
                  {item.text}
                </div>
                {item.status === "pending_approval" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onApprove(item.id)} style={{ background: `${c.green}18`, border: `1px solid ${c.green}40`, color: c.green, padding: "6px 18px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✓ Approve & Publish</button>
                    <button onClick={() => onReject(item.id)} style={{ background: `${c.red}18`, border: `1px solid ${c.red}40`, color: c.red, padding: "6px 18px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ Reject</button>
                  </div>
                ) : <Badge status={item.status} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalyticsPage() {
  const [range, setRange] = useState("7d");
  const bars = [
    { d: "Mon", s: 4, f: 0 }, { d: "Tue", s: 6, f: 1 }, { d: "Wed", s: 5, f: 0 },
    { d: "Thu", s: 8, f: 1 }, { d: "Fri", s: 7, f: 0 }, { d: "Sat", s: 3, f: 0 }, { d: "Sun", s: 2, f: 0 },
  ];
  return (
    <div style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        {["7d","30d","90d"].map((r,i) => (
          <button key={r} onClick={() => setRange(r)} style={{ padding: "5px 14px", border: `1px solid ${c.border}`, cursor: "pointer", fontSize: 12, background: range === r ? c.elevated : "transparent", color: range === r ? c.t1 : c.t3, borderRadius: i === 0 ? "6px 0 0 6px" : i === 2 ? "0 6px 6px 0" : 0, borderLeft: i > 0 ? "none" : undefined }}>{r}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "Total Runs", value: "35", trend: "↑ 12%", tc: c.green },
          { label: "Success Rate", value: "94.3%", trend: "↑ 2.1%", vc: c.green, tc: c.green },
          { label: "Tokens Used", value: "42.8K", trend: "↑ 18%", vc: c.cyan, tc: c.green },
          { label: "Published", value: "14", trend: "↑ 5 items", tc: c.green },
        ].map(k => (
          <div key={k.label} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, color: c.t3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.vc || c.t1, fontFamily: "monospace", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: k.tc || c.t3, marginTop: 5 }}>{k.trend} vs prev period</div>
          </div>
        ))}
      </div>
      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: 18 }}>
        <div style={{ fontSize: 13, color: c.t1, fontWeight: 600, marginBottom: 14 }}>Automation Runs — Last 7 Days</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 130 }}>
          {bars.map(b => (
            <div key={b.d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: 106, gap: 2 }}>
                {b.f > 0 && <div style={{ width: "55%", height: `${(b.f / 10) * 106}px`, background: c.red, borderRadius: "2px 2px 0 0", opacity: .75 }} />}
                <div style={{ width: "55%", height: `${(b.s / 10) * 106}px`, background: c.cyan, borderRadius: b.f > 0 ? 0 : "2px 2px 0 0" }} />
              </div>
              <div style={{ fontSize: 10, color: c.t3, marginTop: 5 }}>{b.d}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 10, justifyContent: "flex-end" }}>
          {[["Successful", c.cyan], ["Failed", c.red]].map(([l, col]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: c.t3 }}>
              <div style={{ width: 8, height: 8, background: col, borderRadius: 2 }} />{l}
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: 18, marginTop: 14 }}>
        <div style={{ fontSize: 13, color: c.t1, fontWeight: 600, marginBottom: 14 }}>Published by Platform</div>
        {[
          { platform: "twitter", label: "Twitter / X", count: 6, pct: 43 },
          { platform: "linkedin", label: "LinkedIn", count: 4, pct: 29 },
          { platform: "facebook", label: "Facebook", count: 3, pct: 21 },
          { platform: "gmail", label: "Gmail", count: 1, pct: 7 },
        ].map(r => {
          const p = PLATFORM[r.platform];
          return (
            <div key={r.platform} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 20, height: 20, background: p.bg, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: p.color, fontWeight: 700 }}>{p.sym}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: c.t2 }}>{r.label}</span>
                  <span style={{ fontSize: 11, color: c.t3, fontFamily: "monospace" }}>{r.count} posts</span>
                </div>
                <div style={{ height: 4, background: c.elevated, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${r.pct}%`, background: p.color, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IntegrationsPage() {
  const dotColor = { active: c.green, expiring: c.amber, error: c.red, inactive: c.t3 };
  const dotLabel = { active: "Connected", expiring: "Needs attention", error: "Error", inactive: "Not connected" };
  return (
    <div style={{ padding: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 12 }}>
        {INTEGRATIONS.map(int => {
          const p = PLATFORM[int.id] || {};
          return (
            <div key={int.id} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, background: p.bg || c.elevated, border: `1px solid ${(p.color || c.border)}30`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: p.color || c.t2, fontWeight: 700 }}>
                  {p.sym || "?"}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: c.t1, fontWeight: 600 }}>{int.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor[int.status] }} />
                    <span style={{ fontSize: 10, color: dotColor[int.status] }}>{dotLabel[int.status]}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: c.t3, fontFamily: "monospace", marginBottom: 12 }}>{int.handle}</div>
              <button style={{ background: int.status === "inactive" ? `${c.amber}18` : c.elevated, border: `1px solid ${int.status === "inactive" ? c.amber + "40" : c.border}`, color: int.status === "inactive" ? c.amber : c.t2, padding: "5px 0", borderRadius: 6, fontSize: 11, cursor: "pointer", width: "100%" }}>
                {int.status === "inactive" ? "Connect" : int.status === "error" ? "Reconnect" : "Manage"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Placeholder({ icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 52px)", flexDirection: "column", gap: 10, color: c.t3 }}>
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div style={{ fontSize: 14, color: c.t2, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12 }}>Available in the live platform</div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("automations");
  const [content, setContent] = useState(INITIAL_CONTENT);
  const [toasts, setToasts] = useState([]);

  const toast = (msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
  };

  const pending = content.filter(i => i.status === "pending_approval").length;

  const handleRun = (auto) => {
    const item = {
      id: Date.now(),
      platform: auto.platform,
      status: "pending_approval",
      text: GENERATED_POSTS[auto.platform] || "AI-generated content ready for your review.",
      automation: auto.name,
      age: "Just now",
    };
    setContent(p => [item, ...p]);
    toast("✓ Content generated — redirecting to Content Queue");
    setTimeout(() => setPage("content"), 900);
  };

  const handleApprove = (id) => {
    setContent(p => p.map(i => i.id === id ? { ...i, status: "approved" } : i));
    toast("Content approved and queued for publishing");
  };

  const handleReject = (id) => {
    setContent(p => p.filter(i => i.id !== id));
    toast("Content rejected", "error");
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: c.base, fontFamily: "'DM Sans', system-ui, sans-serif", overflow: "hidden" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        button { transition: filter .12s; }
        button:hover:not(:disabled) { filter: brightness(1.12); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #1E2330; border-radius: 4px; }
      `}</style>
      <Sidebar active={page} go={setPage} pending={pending} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar page={page} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {page === "automations"  && <AutomationsPage onRun={handleRun} />}
          {page === "content"      && <ContentPage items={content} onApprove={handleApprove} onReject={handleReject} />}
          {page === "analytics"    && <AnalyticsPage />}
          {page === "integrations" && <IntegrationsPage />}
          {page === "audit"        && <Placeholder icon="🛡" label="Audit Log" />}
          {page === "settings"     && <Placeholder icon="⚙" label="Settings" />}
        </div>
      </div>
      {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onDone={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
    </div>
  );
}
