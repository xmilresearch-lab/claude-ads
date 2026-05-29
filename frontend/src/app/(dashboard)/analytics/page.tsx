"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/analytics/KpiCard";
import { RunTrendChart } from "@/components/analytics/RunTrendChart";
import { TokenUsageChart } from "@/components/analytics/TokenUsageChart";
import { PlatformChart } from "@/components/analytics/PlatformChart";
import { AutomationTable } from "@/components/analytics/AutomationTable";
import { DATE_RANGE_OPTIONS, formatNumber, formatCost } from "@/lib/analytics/dateRange";
import {
  useAnalyticsOverview,
  useRunTimeSeries,
  useTokenTimeSeries,
  usePlatformStats,
  useAutomationStats,
  useExportCSV,
} from "@/hooks/useAnalytics";
import type { DateRange } from "@/lib/api/analytics";

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("30d");

  const overview = useAnalyticsOverview(range);
  const runSeries = useRunTimeSeries(range);
  const tokenSeries = useTokenTimeSeries(range);
  const platformStats = usePlatformStats(range);
  const automationStats = useAutomationStats(range);
  const exportCSV = useExportCSV();

  if (overview.isError) {
    return (
      <div className="px-6 py-5">
        <EmptyState
          title="Analytics unavailable"
          description="Could not load analytics data"
          action={
            <button
              type="button"
              onClick={() => overview.refetch()}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 px-3 py-1.5 rounded-[4px] transition-colors"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  const kpis = overview.data;

  return (
    <div className="px-6 py-5">
      {/* Header row */}
      <div className="flex justify-between items-center mb-6">
        <PageHeader
          title="Analytics"
          subtitle="Performance and token usage across all automations"
          className="border-0 p-0"
        />

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Date range pill group */}
          <div className="bg-[#0D0E14] border border-[#1E2330] rounded-[6px] p-0.5 inline-flex">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                className={
                  range === opt.value
                    ? "px-3 py-1.5 text-xs font-mono rounded-[4px] transition-colors bg-[#1E2330] text-white"
                    : "px-3 py-1.5 text-xs font-mono rounded-[4px] transition-colors text-[#6B7280] hover:text-white"
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={() => exportCSV.mutate(range)}
            disabled={exportCSV.isPending}
            className="border border-[#1E2330] hover:border-[#2D3447] text-[#9CA3AF] hover:text-white text-xs font-mono px-3 py-1.5 rounded-[4px] flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {exportCSV.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Runs"
          value={kpis ? formatNumber(kpis.total_runs) : "—"}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Success Rate"
          value={kpis ? `${kpis.success_rate.toFixed(1)}%` : "—"}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Items Published"
          value={kpis ? formatNumber(kpis.items_published) : "—"}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Tokens Used"
          value={kpis ? formatNumber(kpis.total_tokens) : "—"}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Est. Cost"
          value={kpis ? formatCost(kpis.estimated_cost_usd) : "—"}
          isLoading={overview.isLoading}
          className="hidden lg:block"
        />
        <KpiCard
          label="Pending Review"
          value={kpis ? kpis.items_pending_review.toString() : "—"}
          isLoading={overview.isLoading}
          className="hidden lg:block"
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Run Trend — full width */}
        <div className="bg-[#0D0E14] border border-[#1E2330] rounded-[6px] p-4 lg:col-span-2">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#6B7280] mb-4">
            Run Trend
          </h3>
          <RunTrendChart
            data={runSeries.data ?? []}
            range={range}
            isLoading={runSeries.isLoading}
          />
        </div>

        {/* Token Usage */}
        <div className="bg-[#0D0E14] border border-[#1E2330] rounded-[6px] p-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#6B7280] mb-4">
            Token Usage
          </h3>
          <TokenUsageChart
            data={tokenSeries.data ?? []}
            range={range}
            isLoading={tokenSeries.isLoading}
          />
        </div>

        {/* Platform Breakdown */}
        <div className="bg-[#0D0E14] border border-[#1E2330] rounded-[6px] p-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#6B7280] mb-4">
            Platform Breakdown
          </h3>
          <PlatformChart
            data={platformStats.data ?? []}
            isLoading={platformStats.isLoading}
          />
        </div>
      </div>

      {/* Automation Table */}
      <div className="mt-4">
        <p className="text-xs font-mono uppercase tracking-widest text-[#6B7280] mb-3">
          Automation Performance
        </p>
        <AutomationTable
          data={automationStats.data ?? []}
          isLoading={automationStats.isLoading}
        />
      </div>
    </div>
  );
}
