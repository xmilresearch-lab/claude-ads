"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Zap, CheckSquare2, Plug, BarChart3, Shield,
  Settings, ChevronRight, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { APP_NAME } from "@/lib/utils/constants";
import { useAuth } from "@/lib/hooks/use-auth";
import { listContent } from "@/lib/api/endpoints/content";

const NAV_ITEMS = [
  { href: "/automations",  label: "Automations",   icon: Zap },
  { href: "/content",      label: "Content Queue",  icon: CheckSquare2, pendingBadge: true },
  { href: "/integrations", label: "Integrations",   icon: Plug },
  { href: "/analytics",    label: "Analytics",      icon: BarChart3 },
  { href: "/audit",        label: "Audit Log",       icon: Shield },
  { href: "/settings",     label: "Settings",        icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const { data: pendingContent = [] } = useQuery({
    queryKey: ["content", "pending-sidebar"],
    queryFn: () => listContent({ status: "pending_approval", limit: 99 }),
    staleTime: 30_000,
    enabled: !!user,
    retry: false,
  });
  const pendingCount = pendingContent.length;

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-bg-surface">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-amber">
          <Zap className="h-4 w-4 text-bg-base" />
        </div>
        <span className="font-display font-bold text-text-primary tracking-wide">{APP_NAME}</span>
        <span className="ml-auto status-live" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <p className="mb-1.5 px-3 pt-2 text-2xs font-mono text-text-muted uppercase tracking-widest">
          Workspace
        </p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
            const hasBadge = "pendingBadge" in rest;
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn("nav-item", active && "active")}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {hasBadge && pendingCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-2xs font-mono font-bold text-bg-base">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
                {active && !hasBadge && <ChevronRight className="h-3 w-3 text-amber" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber text-xs font-display font-bold text-bg-base">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-text-primary">{user?.email ?? "—"}</p>
            <p className="text-2xs font-mono text-text-muted uppercase">{user?.plan ?? "free"}</p>
          </div>
          <button
            onClick={logout}
            className="rounded p-1 text-text-muted transition-colors hover:text-danger"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
