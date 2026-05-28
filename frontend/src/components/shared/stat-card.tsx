import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  accent?: "amber" | "cyan" | "success" | "danger";
  className?: string;
}

const ACCENT_COLORS = {
  amber:   "text-amber",
  cyan:    "text-cyan",
  success: "text-success",
  danger:  "text-danger",
};

export function StatCard({ label, value, sub, icon: Icon, trend, accent = "cyan", className }: StatCardProps) {
  const valueColor = ACCENT_COLORS[accent];

  return (
    <Card className={cn("hover:border-border-strong transition-colors", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-2xs font-mono text-text-muted uppercase tracking-widest">{label}</p>
            <p className={cn("text-2xl font-display font-bold tabular-nums animate-count-up", valueColor)}>
              {value}
            </p>
            {sub && <p className="text-xs text-text-muted">{sub}</p>}
          </div>
          {Icon && (
            <div className="rounded bg-bg-elevated p-2">
              <Icon className={cn("h-4 w-4", valueColor)} />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <span className={cn("text-2xs font-mono", trend.value >= 0 ? "text-success" : "text-danger")}>
              {trend.value >= 0 ? "+" : ""}{trend.value}%
            </span>
            <span className="text-2xs text-text-muted">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
