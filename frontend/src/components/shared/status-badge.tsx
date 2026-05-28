import { Badge } from "@/components/ui/badge";
import type { RunStatus, ContentStatus, IntegrationStatus } from "@/lib/api/types";

type AnyStatus = RunStatus | ContentStatus | IntegrationStatus | "active" | "paused" | "error";

const STATUS_MAP: Record<string, { variant: "default" | "success" | "danger" | "warning" | "info" | "secondary"; label: string }> = {
  // Run statuses
  pending:          { variant: "secondary", label: "PENDING" },
  running:          { variant: "info",      label: "RUNNING" },
  success:          { variant: "success",   label: "SUCCESS" },
  failed:           { variant: "danger",    label: "FAILED" },
  blocked:          { variant: "warning",   label: "BLOCKED" },
  // Content statuses
  pending_approval: { variant: "warning",   label: "PENDING" },
  approved:         { variant: "info",      label: "APPROVED" },
  rejected:         { variant: "danger",    label: "REJECTED" },
  published:        { variant: "success",   label: "PUBLISHED" },
  // Integration statuses
  active:           { variant: "success",   label: "ACTIVE" },
  inactive:         { variant: "secondary", label: "INACTIVE" },
  expired:          { variant: "danger",    label: "EXPIRED" },
  // Automation active
  paused:           { variant: "secondary", label: "PAUSED" },
  error:            { variant: "danger",    label: "ERROR" },
};

interface StatusBadgeProps {
  status: AnyStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { variant: "secondary" as const, label: status.toUpperCase() };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
