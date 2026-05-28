"use client";

import { useQuery } from "@tanstack/react-query";
import { Settings, LogOut, User } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/hooks/use-auth";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { BACKEND_URL } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

function SystemStatus() {
  const { data, isFetching } = useQuery({
    queryKey: ["system-health"],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/health/ready`);
      return { ready: res.ok };
    },
    refetchInterval: 60_000,
    retry: 1,
    staleTime: 30_000,
  });

  if (data === undefined || isFetching && data === undefined) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="status-live" />
        <span className="text-2xs font-mono text-text-muted">Checking…</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "h-2 w-2 rounded-full",
        data.ready ? "bg-success" : "bg-danger animate-pulse",
      )} />
      <span className={cn(
        "text-2xs font-mono",
        data.ready ? "text-text-muted" : "text-danger",
      )}>
        {data.ready ? "All systems operational" : "Degraded"}
      </span>
    </div>
  );
}

export function Topbar() {
  const { user, logout } = useAuth();
  const { data: workspace } = useWorkspace();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between
                       border-b border-border bg-bg-base/80 backdrop-blur-sm px-5">
      {/* Left: workspace breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-2xs font-mono text-text-muted uppercase tracking-widest">
          Workspace
        </span>
        <span className="text-2xs font-mono text-text-muted">/</span>
        <span className="font-display text-sm text-text-primary">
          {workspace?.name ?? "—"}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <SystemStatus />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full bg-amber
                         text-xs font-display font-bold text-bg-base
                         hover:bg-amber-dark transition-colors"
              aria-label="User menu"
            >
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-text-primary truncate">{user?.email}</p>
              <p className="text-2xs font-mono text-text-muted uppercase">{user?.plan ?? "free"}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <User className="h-3.5 w-3.5" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 text-danger focus:text-danger cursor-pointer"
              onClick={logout}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
