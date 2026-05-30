"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatNumber } from "@/lib/analytics/dateRange";
import type { AutomationStat } from "@/lib/api/analytics";

interface AutomationTableProps {
  data: AutomationStat[];
  isLoading?: boolean;
}

type SortKey = "total_runs" | "tokens_used";
type SortDir = "asc" | "desc";

const MAX_ROWS = 10;

function SuccessRatePill({ rate }: { rate: number }) {
  const pct = `${rate.toFixed(1)}%`;
  if (rate >= 80) {
    return (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] text-emerald-400 bg-emerald-400/10">
        {pct}
      </span>
    );
  }
  if (rate >= 50) {
    return (
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] text-amber-400 bg-amber-400/10">
        {pct}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] text-red-400 bg-red-400/10">
      {pct}
    </span>
  );
}

export function AutomationTable({ data, isLoading }: AutomationTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("total_runs");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAll, setShowAll] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...data].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === "desc" ? -diff : diff;
  });

  const visible = showAll ? sorted : sorted.slice(0, MAX_ROWS);
  const hasMore = sorted.length > MAX_ROWS && !showAll;

  const sortIcon = (col: SortKey) => {
    if (sortKey !== col) return null;
    return sortDir === "desc" ? (
      <ChevronDown className="inline w-3 h-3 ml-0.5" />
    ) : (
      <ChevronUp className="inline w-3 h-3 ml-0.5" />
    );
  };

  return (
    <div className="bg-[#0D0E14] border border-[#1E2330] rounded-[6px] overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[520px]">
        <thead>
          <tr className="bg-[#060709] border-b border-[#1E2330]">
            <th className="sticky left-0 bg-[#060709] px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[#6B7280]">
              Automation
            </th>
            <th
              className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-right cursor-pointer select-none hover:text-white transition-colors"
              onClick={() => handleSort("total_runs")}
            >
              <span className={sortKey === "total_runs" ? "text-white" : "text-[#6B7280]"}>
                Runs
                {sortIcon("total_runs")}
              </span>
            </th>
            <th className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[#6B7280]">
              Success Rate
            </th>
            <th
              className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-right cursor-pointer select-none"
              onClick={() => handleSort("tokens_used")}
            >
              <span className={sortKey === "tokens_used" ? "text-white" : "text-[#6B7280]"}>
                Tokens
                {sortIcon("tokens_used")}
              </span>
            </th>
            <th className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[#6B7280] text-right">
              Last Run
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#1A1D2B] last:border-0">
                {Array.from({ length: 5 }).map((__, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-[#1E2330] rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : visible.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-6 text-center text-xs font-mono text-[#374151]"
              >
                No automation runs in this period
              </td>
            </tr>
          ) : (
            visible.map((row) => {
              const successRate =
                row.total_runs > 0
                  ? (row.successful_runs / row.total_runs) * 100
                  : 0;
              return (
                <tr
                  key={row.automation_id}
                  className="border-b border-[#1A1D2B] last:border-0 hover:bg-[#060709] transition-colors"
                >
                  <td className="sticky left-0 bg-[#0D0E14] px-4 py-3">
                    <p className="font-mono text-xs text-white">{row.automation_name}</p>
                    <p className="text-[10px] font-mono text-[#6B7280] mt-0.5">
                      {row.platform}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[#06B6D4]">
                    {row.total_runs.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <SuccessRatePill rate={successRate} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[#9CA3AF]">
                    {formatNumber(row.tokens_used)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-[#6B7280]">
                    {row.last_run_at
                      ? formatDistanceToNow(new Date(row.last_run_at), {
                          addSuffix: true,
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>

      {hasMore && (
        <div className="border-t border-[#1E2330]">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full text-xs text-amber-400 hover:text-amber-300 font-mono px-4 py-2.5 text-left transition-colors"
          >
            Show all {sorted.length} automations
          </button>
        </div>
      )}
    </div>
  );
}
