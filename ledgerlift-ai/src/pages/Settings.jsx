import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, CreditCard, Link2, AlertTriangle, ChevronRight, Check } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import GlowDivider from "../components/ui/GlowDivider";
import { useApp } from "../context/AppContext";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} style={{ color: "var(--teal)" }} />
      <span className="section-label">{title}</span>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button role="switch" aria-checked={checked} onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
      style={{ background: checked ? "var(--teal)" : "var(--bg-raised)", border: "1px solid var(--border)" }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-300"
        style={{ background: checked ? "var(--bg-void)" : "var(--text-muted)", transform: checked ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  );
}

const CONNECTIONS = [
  { name: "QuickBooks", icon: "💼", status: "Not connected" },
  { name: "Xero",       icon: "📘", status: "Not connected" },
  { name: "Wave",       icon: "🌊", status: "Not connected" },
];

export default function Settings() {
  const { state, dispatch } = useApp();
  const [businessName, setBusinessName] = useState(state.businessName);
  const [email, setEmail] = useState("owner@mybusiness.com");
  const [currency, setCurrency] = useState("USD");
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({ weeklyReport: true, invoiceAlerts: true, aiTips: false, taxReminders: true });

  const toggleNotif = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  const handleSave = () => {
    dispatch({ type: "SET_BUSINESS", payload: { name: businessName, user: businessName } });
    dispatch({ type: "SET_CURRENCY", payload: currency });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-outfit font-extrabold text-[var(--text-primary)] mb-1">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)]">Manage your account and preferences</p>
      </div>

      <Card>
        <SectionHeader icon={User} title="Profile" />
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-outfit">Business Name</label>
            <input value={businessName} onChange={e => setBusinessName(e.target.value)}
              className="w-full bg-[var(--bg-raised)] border rounded-xl px-4 py-2.5 text-sm font-outfit text-[var(--text-primary)] transition-all"
              style={{ borderColor: "var(--border)" }}
              onFocus={e => { e.target.style.borderColor = "var(--teal)"; e.target.style.boxShadow = "var(--teal-glow)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-outfit">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              className="w-full bg-[var(--bg-raised)] border rounded-xl px-4 py-2.5 text-sm font-outfit text-[var(--text-primary)] transition-all"
              style={{ borderColor: "var(--border)" }}
              onFocus={e => { e.target.style.borderColor = "var(--teal)"; e.target.style.boxShadow = "var(--teal-glow)"; }}
              onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-outfit">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full bg-[var(--bg-raised)] border rounded-xl px-4 py-2.5 text-sm font-outfit text-[var(--text-primary)] cursor-pointer"
              style={{ borderColor: "var(--border)" }}>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="CAD">CAD — Canadian Dollar</option>
              <option value="AUD">AUD — Australian Dollar</option>
            </select>
          </div>
          <Button variant="primary" size="sm" inline onClick={handleSave}>
            {saved ? <><Check size={14} /> Saved!</> : "Save Changes"}
          </Button>
        </div>
      </Card>

      <GlowDivider />

      <Card>
        <SectionHeader icon={Bell} title="Notifications" />
        <div className="space-y-4">
          {[
            { key: "weeklyReport",  label: "Weekly financial report", desc: "Every Monday morning" },
            { key: "invoiceAlerts", label: "Invoice due alerts",      desc: "3 days before due date" },
            { key: "aiTips",        label: "AI financial tips",       desc: "Personalized suggestions" },
            { key: "taxReminders",  label: "Tax deadline reminders",  desc: "Quarterly reminders" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-outfit font-semibold text-[var(--text-primary)]">{label}</div>
                <div className="text-xs text-[var(--text-muted)]">{desc}</div>
              </div>
              <Toggle checked={notifications[key]} onChange={() => toggleNotif(key)} />
            </div>
          ))}
        </div>
      </Card>

      <GlowDivider />

      <Card>
        <SectionHeader icon={CreditCard} title="Subscription" />
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-outfit font-bold text-[var(--text-primary)]">Free Plan</span>
            <Badge variant="muted">Current Plan</Badge>
          </div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-1 mb-4">
            <li>✓ Up to 50 transactions/month</li>
            <li>✓ 5 AI assistant questions/day</li>
            <li>✓ Basic reports</li>
            <li className="text-[var(--text-muted)]">✗ Unlimited transactions</li>
            <li className="text-[var(--text-muted)]">✗ Unlimited AI chats</li>
            <li className="text-[var(--text-muted)]">✗ PDF exports</li>
          </ul>
          <Button variant="secondary" size="md" fullWidth>Upgrade to Pro — $19/mo</Button>
        </div>
      </Card>

      <GlowDivider />

      <Card>
        <SectionHeader icon={Link2} title="Connected Apps" />
        <div className="space-y-3">
          {CONNECTIONS.map(({ name, icon, status }) => (
            <div key={name} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <div className="text-sm font-outfit font-semibold text-[var(--text-primary)]">{name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{status}</div>
                </div>
              </div>
              <button className="text-xs font-outfit font-semibold px-3 py-1.5 rounded-lg border transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                onClick={() => alert("Available in Phase 2")}>
                Connect <ChevronRight size={12} className="inline" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <GlowDivider />

      <Card>
        <SectionHeader icon={AlertTriangle} title="Danger Zone" />
        <p className="text-sm text-[var(--text-secondary)] mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
        <Button variant="danger" size="sm" inline
          onClick={() => confirm("Are you sure? This will permanently delete your account.") && alert("Account deletion is disabled in demo mode.")}>
          Delete Account
        </Button>
      </Card>

      <div className="pb-8 text-center text-xs text-[var(--text-muted)]">LedgerLift AI v1.0.0 · Built with ❤️ for small business owners</div>
    </motion.div>
  );
}
