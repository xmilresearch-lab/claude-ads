"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface KpiCardProps {
  label: string;
  value: string;
  trend?: number;
  isLoading?: boolean;
  className?: string;
}

export function KpiCard({ label, value, trend, isLoading, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        "bg-[#0D0E14] border border-[#1E2330] rounded-[6px] p-4",
        className,
      )}
    >
      <p className="text-xs font-mono text-[#6B7280] uppercase tracking-wider">{label}</p>

      {isLoading ? (
        <>
          <div className="mt-2 h-8 w-28 bg-[#1E2330] rounded animate-pulse" />
          <div className="mt-2 h-3 w-24 bg-[#1E2330] rounded animate-pulse" />
        </>
      ) : (
        <>
          <p className="font-mono text-2xl font-bold text-white mt-1">{value}</p>
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-mono">
            {trend === undefined || trend === 0 ? (
              <span className="text-[#6B7280]">—</span>
            ) : trend > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">+{trend.toFixed(1)}%</span>
                <span className="text-[#6B7280] ml-1">vs prev period</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-red-400" />
                <span className="text-red-400">{trend.toFixed(1)}%</span>
                <span className="text-[#6B7280] ml-1">vs prev period</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
