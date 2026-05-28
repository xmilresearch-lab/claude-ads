"use client";

import { Bell } from "lucide-react";
import { useWorkspace } from "@/lib/hooks/use-workspace";

export function Topbar() {
  const { data: workspace } = useWorkspace();

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-bg-surface px-5">
      <div className="flex items-center gap-2">
        <span className="text-2xs font-mono text-text-muted uppercase tracking-widest">
          WORKSPACE
        </span>
        <span className="text-2xs font-mono text-text-muted">/</span>
        <span className="text-sm font-display text-text-primary">
          {workspace?.name ?? "—"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="status-live" />
          <span className="text-2xs font-mono text-text-muted">LIVE</span>
        </div>
      </div>
    </header>
  );
}
