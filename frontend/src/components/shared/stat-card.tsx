import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  accentColor?: "amber" | "cyan" | "success" | "danger";
  className?: string;
}

const ACCENT: Record<string, string> = {
  amber:   "text-amber",
  cyan:    "text-cyan",
  success: "text-success",
  danger:  "text-danger",
};

export function StatCard({
  title, value, delta, deltaLabel, icon: Icon, accentColor = "cyan", className,
}: StatCardProps) {
  const isNumeric = typeof value === "number";

  return (
    <div className={cn("card-command p-4", className)}>
      {/* Top: icon + title */}
      <div className="mb-2 flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-text-muted" />}
        <p className="text-2xs font-mono uppercase tracking-wide text-text-muted">{title}</p>
      </div>

      {/* Center: value */}
      <p className={cn(
        "font-display text-2xl font-bold text-text-primary tabular-nums",
        isNumeric && "font-mono",
        ACCENT[accentColor],
      )}>
        {value}
      </p>

      {/* Bottom: delta */}
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={cn(
            "text-2xs font-mono font-medium",
            delta >= 0 ? "text-success" : "text-danger",
          )}>
            {delta >= 0 ? "+" : ""}{delta}%
          </span>
          {deltaLabel && (
            <span className="text-2xs text-text-muted">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
