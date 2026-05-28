"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, FileText, PlugZap, BarChart2, ScrollText,
  Settings, ChevronRight, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { APP_NAME } from "@/lib/utils/constants";
import { useAuth } from "@/lib/hooks/use-auth";

const NAV_ITEMS = [
  { href: "/automations",  label: "Automations",    icon: Zap },
  { href: "/content",      label: "Content Queue",   icon: FileText },
  { href: "/integrations", label: "Integrations",    icon: PlugZap },
  { href: "/analytics",    label: "Analytics",       icon: BarChart2 },
  { href: "/audit",        label: "Audit Log",       icon: ScrollText },
  { href: "/settings",     label: "Settings",        icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-amber">
          <Zap className="h-4 w-4 text-bg-base" />
        </div>
        <span className="font-display font-bold text-text-primary tracking-wide">
          {APP_NAME}
        </span>
        <span className="ml-auto">
          <span className="status-live" />
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("nav-item", active && "active")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
              {active && <ChevronRight className="ml-auto h-3 w-3 text-amber" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated border border-border text-xs font-display font-bold text-text-secondary">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-text-primary">{user?.email ?? "—"}</p>
            <p className="text-2xs font-mono text-text-muted uppercase">{user?.plan ?? "free"}</p>
          </div>
          <button
            onClick={logout}
            className="rounded p-1 text-text-muted hover:text-danger transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
