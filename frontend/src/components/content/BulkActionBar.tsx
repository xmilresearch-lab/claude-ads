"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { useBulkApprove, useBulkReject } from "@/hooks/useContent";

interface BulkActionBarProps {
  selectedIds: string[];
  onClear: () => void;
}

export function BulkActionBar({ selectedIds, onClear }: BulkActionBarProps) {
  const [rejectExpanded, setRejectExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const bulkApproveMutation = useBulkApprove();
  const bulkRejectMutation = useBulkReject();

  const count = selectedIds.length;
  const visible = count > 0;

  const handleApprove = () => {
    bulkApproveMutation.mutate(selectedIds, {
      onSuccess: (result) => {
        const failed = result.failed.length;
        if (failed > 0) {
          toast.warning(`Approved ${result.succeeded.length}, failed ${failed}`);
        } else {
          toast.success(`${result.succeeded.length} item${result.succeeded.length !== 1 ? "s" : ""} approved`);
        }
        onClear();
      },
      onError: () => toast.error("Bulk approve failed"),
    });
  };

  const handleReject = () => {
    bulkRejectMutation.mutate(
      { ids: selectedIds, reason: rejectReason || undefined },
      {
        onSuccess: (result) => {
          const failed = result.failed.length;
          if (failed > 0) {
            toast.warning(`Rejected ${result.succeeded.length}, failed ${failed}`);
          } else {
            toast.success(`${result.succeeded.length} item${result.succeeded.length !== 1 ? "s" : ""} rejected`);
          }
          setRejectReason("");
          setRejectExpanded(false);
          onClear();
        },
        onError: () => toast.error("Bulk reject failed"),
      },
    );
  };

  const isActionPending = bulkApproveMutation.isPending || bulkRejectMutation.isPending;

  return (
    <div
      className={cn(
        "fixed bottom-4 z-30 transition-all duration-200",
        // Mobile: full width with margin
        "left-4 right-4",
        // Desktop: centered floating pill
        "sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-6",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
      )}
    >
      <div className="bg-[#111318] border border-[#1E2330] rounded-[6px] shadow-2xl overflow-hidden">
        {/* Main bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0 sm:gap-4 px-5 py-3">
          {/* Count */}
          <span data-testid="selected-count" className="text-sm font-mono text-text-primary whitespace-nowrap py-1 sm:py-0">
            <span className="text-amber-400 font-bold">{count}</span>{" "}
            {count === 1 ? "item" : "items"} selected
          </span>

          {/* Separator — desktop only */}
          <div className="hidden sm:block w-px h-5 bg-[#1E2330]" />
          {/* Divider — mobile only */}
          <div className="sm:hidden h-px w-full bg-[#1E2330]" />

          {/* Approve */}
          <button
            type="button"
            onClick={handleApprove}
            disabled={!visible || isActionPending}
            className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors py-2 sm:py-0 min-h-[48px] sm:min-h-0"
          >
            <Check size={14} />
            Approve all
          </button>

          <div className="hidden sm:block w-px h-5 bg-[#1E2330]" />
          <div className="sm:hidden h-px w-full bg-[#1E2330]" />

          {/* Reject toggle */}
          <button
            type="button"
            onClick={() => setRejectExpanded((v) => !v)}
            disabled={isActionPending}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors py-2 sm:py-0 min-h-[48px] sm:min-h-0"
          >
            <X size={14} />
            Reject all
            {rejectExpanded ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>

          <div className="hidden sm:block w-px h-5 bg-[#1E2330]" />
          <div className="sm:hidden h-px w-full bg-[#1E2330]" />

          {/* Clear */}
          <button
            type="button"
            onClick={onClear}
            disabled={isActionPending}
            className="text-sm text-text-muted hover:text-text-primary disabled:opacity-50 transition-colors py-2 sm:py-0 min-h-[48px] sm:min-h-0"
          >
            Clear
          </button>
        </div>

        {/* Inline reject reason */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            rejectExpanded ? "max-h-40" : "max-h-0",
          )}
        >
          <div className="px-5 pb-4 border-t border-[#1E2330] pt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1.5">
                Rejection reason{" "}
                <span className="text-text-muted/60">(optional)</span>
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Add a reason…"
                maxLength={200}
                className="w-full input-command rounded-[4px] px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleReject}
              disabled={isActionPending}
              className="flex items-center justify-center gap-1.5 text-sm text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 hover:border-red-400/60 px-4 py-1.5 rounded-[4px] transition-colors disabled:opacity-50 whitespace-nowrap min-h-[48px] sm:min-h-0"
            >
              {bulkRejectMutation.isPending ? "Rejecting…" : `Reject ${count}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
