import { cn } from "@/lib/utils/cn";
import type { RunStatus, ContentStatus, IntegrationStatus } from "@/lib/api/types";

type AnyStatus = RunStatus | ContentStatus | IntegrationStatus | "active" | "paused" | "error" | string;

interface StatusConfig {
  dot: string;
  label: string;
  text: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Run statuses
  success:          { dot: "bg-success",              label: "Success",  text: "text-success" },
  failed:           { dot: "bg-danger",               label: "Failed",   text: "text-danger" },
  pending:          { dot: "bg-amber animate-pulse",  label: "Pending",  text: "text-amber" },
  running:          { dot: "bg-info animate-pulse",   label: "Running",  text: "text-info" },
  blocked:          { dot: "bg-danger",               label: "Blocked",  text: "text-danger" },
  // Content statuses
  pending_approval: { dot: "bg-amber animate-pulse",  label: "Pending",  text: "text-amber" },
  approved:         { dot: "bg-info",                 label: "Approved", text: "text-info" },
  rejected:         { dot: "bg-danger",               label: "Rejected", text: "text-danger" },
  published:        { dot: "bg-success",              label: "Published",text: "text-success" },
  // Integration / automation statuses
  active:           { dot: "bg-success",              label: "Active",   text: "text-success" },
  inactive:         { dot: "bg-text-muted",           label: "Inactive", text: "text-text-muted" },
  expired:          { dot: "bg-danger",               label: "Expired",  text: "text-danger" },
  paused:           { dot: "bg-text-muted",           label: "Paused",   text: "text-text-muted" },
  error:            { dot: "bg-danger",               label: "Error",    text: "text-danger" },
};

interface StatusBadgeProps {
  status: AnyStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status] ?? {
    dot: "bg-text-muted",
    label: String(status).toUpperCase(),
    text: "text-text-muted",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      <span className={cn("text-2xs font-mono uppercase tracking-wide", cfg.text)}>
        {cfg.label}
      </span>
    </span>
  );
}
