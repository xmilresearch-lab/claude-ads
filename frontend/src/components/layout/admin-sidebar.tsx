"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, Server, ScrollText, Zap, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { APP_NAME } from "@/lib/utils/constants";

const ADMIN_NAV = [
  { href: "/admin",            label: "Overview",      icon: LayoutDashboard, exact: true },
  { href: "/admin/users",      label: "Users",          icon: Users },
  { href: "/admin/workspaces", label: "Workspaces",     icon: Building2 },
  { href: "/admin/usage",      label: "Usage & Tokens", icon: Server },
  { href: "/admin/system",     label: "System Health",  icon: ScrollText },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-amber/30 bg-bg-surface border-t-2 border-t-amber">
      {/* Logo */}
      <div className="flex h-14 flex-col justify-center border-b border-border px-4">
        <span className="text-2xs font-mono text-amber uppercase tracking-widest font-bold">
          ADMIN
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Zap className="h-3.5 w-3.5 text-text-muted" />
          <span className="font-display text-sm font-bold text-text-primary tracking-wide">
            {APP_NAME}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <p className="mb-1.5 px-3 pt-2 text-2xs font-mono text-text-muted uppercase tracking-widest">
          Admin
        </p>
        <div className="space-y-0.5">
          {ADMIN_NAV.map(({ href, label, icon: Icon, ...rest }) => {
            const exact = "exact" in rest ? rest.exact : false;
            const active = exact
              ? pathname === href
              : pathname.startsWith(href) && href !== "/admin";
            return (
              <Link key={href} href={href} className={cn("nav-item", active && "active")}>
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Back to app */}
      <div className="border-t border-border p-3">
        <Link href="/automations" className="nav-item">
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </aside>
  );
}
