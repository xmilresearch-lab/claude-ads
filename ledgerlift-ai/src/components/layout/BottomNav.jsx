import { NavLink } from "react-router-dom";
import { Home, Receipt, BarChart3, Bot, BookOpen } from "lucide-react";

const tabs = [
  { to: "/dashboard", icon: Home,     label: "Home" },
  { to: "/expenses",  icon: Receipt,  label: "Expenses" },
  { to: "/reports",   icon: BarChart3,label: "Reports" },
  { to: "/ai",        icon: Bot,      label: "AI" },
  { to: "/learn",     icon: BookOpen, label: "Learn" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden glass border-t border-[var(--border)]">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 ${
                isActive ? "text-[var(--teal)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} />
                <span className="text-[10px] font-outfit font-600">{label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: "var(--teal)", boxShadow: "0 0 6px var(--teal)" }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
