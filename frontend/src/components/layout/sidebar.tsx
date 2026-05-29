"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, Inbox, Plug, BarChart3, Shield,
  Settings, ChevronRight, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { APP_NAME } from "@/lib/utils/constants";
import { useAuth } from "@/lib/hooks/use-auth";
import { useContent } from "@/hooks/useContent";
import { useIntegrations } from "@/hooks/useIntegrations";

const SETTINGS_SUB_NAV = [
  { href: "/settings/workspace",   label: "Workspace" },
  { href: "/settings/brand-voice", label: "Brand Voice" },
  { href: "/settings/account",     label: "Account" },
  { href: "/settings/danger",      label: "Danger Zone" },
] as const;

const NAV_ITEMS = [
  { href: "/automations",  label: "Automations",   icon: Zap },
  { href: "/content",      label: "Content Queue",  icon: Inbox, pendingBadge: true },
  { href: "/integrations", label: "Integrations",   icon: Plug },
  { href: "/analytics",    label: "Analytics",      icon: BarChart3 },
  { href: "/audit",        label: "Audit Log",       icon: Shield },
  { href: "/settings",     label: "Settings",        icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const { data: integrations = [] } = useIntegrations();
  const hasIntegrationError = integrations.some((i) => i.status === "error");

  const { data: pendingContent } = useContent({ status: "pending_review", limit: 1 });
  const pendingCount = pendingContent?.total ?? 0;

  const onSettings = pathname.startsWith("/settings");

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
            const isSettingsItem = href === "/settings";
            const isIntegrationsItem = href === "/integrations";

            return (
              <div key={href} className={isIntegrationsItem ? "relative" : undefined}>
                <Link href={href} className={cn("nav-item", active && "active")}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {hasBadge && pendingCount > 0 && (
                    <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] bg-amber-500/20 text-amber-400 min-w-[18px] text-center">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                  {active && !hasBadge && (
                    <ChevronRight className={cn(
                      "h-3 w-3 text-amber transition-transform duration-150",
                      isSettingsItem && onSettings && "rotate-90",
                    )} />
                  )}
                </Link>

                {isIntegrationsItem && hasIntegrationError && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}

                {/* Settings sub-nav */}
                {isSettingsItem && (
                  <div
                    className="overflow-hidden transition-all duration-150"
                    style={{ maxHeight: onSettings ? "200px" : "0px" }}
                  >
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3 pb-1">
                      {SETTINGS_SUB_NAV.map((sub) => {
                        const subActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "flex items-center rounded px-2 py-1 text-xs transition-colors",
                              subActive
                                ? "text-amber font-medium"
                                : "text-text-muted hover:text-text-secondary",
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
