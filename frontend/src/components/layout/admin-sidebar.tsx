"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Building2, TrendingUp, Cpu, Zap, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { APP_NAME } from "@/lib/utils/constants";

const ADMIN_NAV = [
  { href: "/admin",            label: "Overview",   icon: Cpu, exact: true },
  { href: "/admin/users",      label: "Users",      icon: Users },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/usage",      label: "Usage",      icon: TrendingUp },
  { href: "/admin/system",     label: "System",     icon: Cpu },
];

export function AdminSidebar() {
  const pathname = usePathname();

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
        <span className="ml-1 text-2xs font-mono text-danger uppercase">ADMIN</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href) && href !== "/admin";
          return (
            <Link key={href} href={href} className={cn("nav-item", active && "active")}>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="border-t border-border p-3">
        <Link href="/automations" className="nav-item">
          <ChevronLeft className="h-4 w-4" />
          <span>Back to App</span>
        </Link>
      </div>
    </aside>
  );
}
