import { NavLink } from "react-router-dom";
import { Home, Receipt, BarChart3, Bot, BookOpen, Settings, TrendingUp } from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: Home,       label: "Dashboard" },
  { to: "/expenses",  icon: Receipt,    label: "Expenses" },
  { to: "/income",    icon: TrendingUp, label: "Income" },
  { to: "/reports",   icon: BarChart3,  label: "Reports" },
  { to: "/ai",        icon: Bot,        label: "AI Assistant" },
  { to: "/learn",     icon: BookOpen,   label: "Learn" },
  { to: "/settings",  icon: Settings,   label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-30 bg-[var(--bg-surface)] border-r border-[var(--border)]">
      <div className="p-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-void font-black text-sm" style={{ background: "var(--teal)", boxShadow: "var(--teal-glow)" }}>LL</div>
          <div>
            <div className="font-outfit font-800 text-[var(--text-primary)] text-sm leading-tight">LedgerLift</div>
            <div className="text-[var(--teal)] text-[10px] font-600 uppercase tracking-widest">AI</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-outfit font-600 transition-all duration-200 ${
                isActive ? "text-[var(--teal)] bg-[var(--teal-dim)] border-l-2 border-[var(--teal)] pl-3.5" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-[var(--border)]">
        <div className="rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] p-3">
          <div className="text-[10px] section-label mb-1">Free Plan</div>
          <div className="text-xs text-[var(--text-secondary)] mb-2">Upgrade for unlimited AI chats</div>
          <NavLink to="/settings" className="text-xs font-600 font-outfit text-[var(--orange)] hover:underline">Upgrade to Pro →</NavLink>
        </div>
      </div>
    </aside>
  );
}
