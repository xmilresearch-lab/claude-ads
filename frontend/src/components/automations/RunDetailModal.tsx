"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { RUN_STATUS_CONFIG } from "@/lib/automations/platforms";
import { useAutomationRuns } from "@/hooks/useAutomations";
import { cn } from "@/lib/utils/cn";

interface RunDetailModalProps {
  open: boolean;
  automationId: string | null;
  automationName?: string;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RunDetailModal({ open, automationId, automationName, onClose }: RunDetailModalProps) {
  const { data, isLoading } = useAutomationRuns(automationId ?? "", !!automationId && open);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !automationId) return null;

  const runs = data?.items ?? [];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0D0E14] border border-[#1E2330] rounded-[6px] w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#1E2330] flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              {automationName ?? "Automation"}
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">Run History</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-[#1E2330] rounded-[4px] animate-pulse" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <EmptyState
              title="No runs yet"
              description="Trigger this automation to see results"
            />
          ) : (
            <div>
              {runs.map((run) => {
                const statusCfg = RUN_STATUS_CONFIG[run.status];
                return (
                  <div
                    key={run.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1D2B] last:border-0"
                  >
                    {/* Status */}
                    <div className="w-24 shrink-0 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          statusCfg.dot,
                          statusCfg.pulse && "animate-pulse",
                        )}
                      />
                      <span className={cn("text-xs font-mono", statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Started */}
                    <div className="w-36 shrink-0">
                      <span className="text-xs font-mono text-[#9CA3AF]">
                        {format(new Date(run.started_at), "MMM d, HH:mm:ss")}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="w-20 shrink-0">
                      {run.duration_ms != null ? (
                        <span className="text-xs font-mono text-[#6B7280]">
                          {formatDuration(run.duration_ms)}
                        </span>
                      ) : run.status === "running" || run.status === "pending" ? (
                        <span className="text-xs font-mono text-[#6B7280] animate-pulse">…</span>
                      ) : (
                        <span className="text-xs font-mono text-[#6B7280]">—</span>
                      )}
                    </div>

                    {/* Result message */}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-[#9CA3AF] truncate block">
                        {run.result?.message ?? run.error ?? "—"}
                      </span>
                    </div>

                    {/* Tokens */}
                    {run.tokens_used != null && (
                      <div className="w-20 shrink-0 text-right">
                        <span className="text-[10px] font-mono text-[#6B7280]">
                          {run.tokens_used} tokens
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && runs.length > 0 && (
          <div className="px-4 py-3 border-t border-[#1E2330] shrink-0">
            <p className="text-xs text-[#6B7280] font-mono">
              Showing latest 10 runs • Auto-refreshes while running
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
