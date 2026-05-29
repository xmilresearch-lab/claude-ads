"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { useSystemHealth, useAdminTokenUsage } from "@/hooks/useAdmin";
import { formatNumber } from "@/lib/analytics/dateRange";
import { KpiCard } from "@/components/analytics/KpiCard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function AdminSystemPage() {
  const { data: health, isLoading, isError, refetch } = useSystemHealth();
  const { data: tokenData, isLoading: isTokenLoading } = useAdminTokenUsage();

  const [flashed, setFlashed] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | undefined>();

  if (health?.checked_at && health.checked_at !== lastCheckedAt) {
    setLastCheckedAt(health.checked_at);
    setFlashed(true);
  }

  useEffect(() => {
    if (!flashed) return;
    const t = setTimeout(() => setFlashed(false), 800);
    return () => clearTimeout(t);
  }, [flashed]);

  const headerRight = (
    <div className="flex items-center gap-3">
      {health?.checked_at && (
        <span
          className={cn(
            "text-xs font-mono transition-colors duration-300",
            flashed ? "text-amber-400" : "text-[#6B7280]",
          )}
        >
          Last checked: {format(new Date(health.checked_at), "HH:mm:ss")}
        </span>
      )}
      <button
        onClick={() => refetch()}
        disabled={isLoading}
        className="flex items-center gap-1.5 rounded-[6px] bg-[#0D0E14] border border-[#1E2330] px-2.5 py-1.5 text-xs font-mono text-[#9CA3AF] transition-colors hover:border-[#374151] hover:text-white disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
        Refresh
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="System Health"
          description="Live status of all platform dependencies"
          action={headerRight}
        />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-[6px] bg-[#0D0E14] border border-[#1E2330]"
              />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <KpiCard key={i} label="" value="" isLoading />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (isError && !health) {
    return (
      <>
        <PageHeader
          title="System Health"
          description="Live status of all platform dependencies"
          action={headerRight}
        />
        <div className="p-6">
          <EmptyState
            title="System health unavailable"
            description="Unable to fetch system status"
            action={
              <Button size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const totals = health!.totals;

  const tokenItems = tokenData?.by_workspace
    ? [...tokenData.by_workspace].sort((a, b) => b.tokens - a.tokens).slice(0, 8)
    : [];
  const maxTokens = Math.max(...tokenItems.map((w) => w.tokens), 1);

  return (
    <>
      <PageHeader
        title="System Health"
        description="Live status of all platform dependencies"
        action={headerRight}
      />

      <div className="p-6">
        {/* Overall status banner */}
        <div className="mb-6">
          {health!.status === "healthy" && (
            <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-[6px] px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-display text-sm text-emerald-400">
                All systems operational
              </span>
            </div>
          )}
          {health!.status === "degraded" && (
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-[6px] px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-display text-sm text-amber-400">
                Some services degraded
              </span>
            </div>
          )}
          {health!.status === "down" && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-[6px] px-4 py-3 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span className="font-display text-sm text-red-400">
                Critical services are down
              </span>
            </div>
          )}
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {health!.services.map((service) => (
            <div
              key={service.name}
              className={cn(
                "bg-[#0D0E14] rounded-[6px] p-4",
                service.status === "up" && "border border-[#1E2330]",
                service.status === "slow" && "border border-amber-500/30",
                service.status === "down" && "border border-red-500/30",
              )}
            >
              <p className="font-display text-sm font-semibold text-white">
                {service.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    service.status === "up" && "bg-emerald-400",
                    service.status === "slow" && "bg-amber-400 animate-pulse",
                    service.status === "down" && "bg-red-500 animate-pulse",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-mono",
                    service.status === "up" && "text-emerald-400",
                    service.status === "slow" && "text-amber-400",
                    service.status === "down" && "text-red-400",
                  )}
                >
                  {service.status === "up" && "Operational"}
                  {service.status === "slow" && "Degraded"}
                  {service.status === "down" && "Down"}
                </span>
              </div>
              <p className="text-xs font-mono text-[#06B6D4] mt-1">
                {service.latency_ms != null ? `${service.latency_ms}ms` : "—"}
              </p>
              {service.message && (
                <p className="text-xs text-[#9CA3AF] mt-1 italic">{service.message}</p>
              )}
            </div>
          ))}
        </div>

        {/* Platform Totals */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <KpiCard label="Total Users" value={formatNumber(totals.total_users)} />
          <KpiCard label="Total Workspaces" value={formatNumber(totals.total_workspaces)} />
          <KpiCard label="Total Automations" value={formatNumber(totals.total_automations)} />
          <KpiCard label="Runs Today" value={formatNumber(totals.total_runs_today)} />
          <KpiCard label="Tokens Today" value={formatNumber(totals.total_tokens_today)} />
          <div className="bg-[#0D0E14] border border-[#1E2330] rounded-[6px] p-4">
            <p className="text-xs font-mono text-[#6B7280] uppercase tracking-wider">
              Queue Depth
            </p>
            <p
              className={cn(
                "font-mono text-2xl font-bold mt-1",
                totals.queue_depth > 500
                  ? "text-red-400"
                  : totals.queue_depth > 100
                  ? "text-amber-400"
                  : "text-white",
              )}
            >
              {totals.queue_depth.toString()}
            </p>
          </div>
        </div>

        {/* Token Usage By Workspace */}
        <div className="mt-6">
          <p className="text-xs font-mono text-[#6B7280] uppercase tracking-wider mb-3">
            Token Usage by Workspace (All Time)
          </p>

          {isTokenLoading && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <div className="h-3 w-32 animate-pulse bg-[#1E2330] rounded" />
                  <div className="h-1.5 flex-1 animate-pulse bg-[#1E2330] rounded-full" />
                  <div className="h-3 w-16 animate-pulse bg-[#1E2330] rounded" />
                </div>
              ))}
            </>
          )}

          {!isTokenLoading && tokenItems.length === 0 && (
            <p className="text-xs font-mono text-[#6B7280]">No token usage data available.</p>
          )}

          {!isTokenLoading &&
            tokenItems.map((ws) => (
              <div key={ws.workspace_name} className="flex items-center gap-3 mb-2">
                <p className="text-xs text-white w-40 shrink-0 truncate">
                  {ws.workspace_name}
                </p>
                <div className="flex-1 h-1.5 bg-[#1E2330] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#06B6D4]"
                    style={{ width: `${(ws.tokens / maxTokens) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-[#06B6D4] w-20 text-right shrink-0">
                  {formatNumber(ws.tokens)}
                </p>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
