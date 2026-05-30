"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { CONTENT_STATUS_CONFIG, CONTENT_PLATFORM_CONFIG } from "@/lib/content/config";
import { useApproveContent } from "@/hooks/useContent";
import type { ContentItem } from "@/lib/api/content";
import { cn } from "@/lib/utils/cn";

interface ContentCardProps {
  item: ContentItem;
  selected: boolean;
  onSelectToggle: (id: string) => void;
  onReview: (item: ContentItem) => void;
  onQuickReject: (item: ContentItem) => void;
}

export function ContentCard({
  item,
  selected,
  onSelectToggle,
  onReview,
  onQuickReject,
}: ContentCardProps) {
  const statusConfig = CONTENT_STATUS_CONFIG[item.status];
  const platformConfig = CONTENT_PLATFORM_CONFIG[item.platform];
  const isPendingReview = item.status === "pending_review";

  const approveMutation = useApproveContent();

  const handleApprove = () => {
    approveMutation.mutate(item.id, {
      onSuccess: () => toast.success("Content approved"),
      onError: () => toast.error("Failed to approve content"),
    });
  };

  return (
    <div
      className={cn(
        "bg-[#0D0E14] border rounded-[6px] p-4 transition-colors",
        selected ? "border-amber-500/60" : "border-[#1E2330]",
      )}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onSelectToggle(item.id)}
          className={cn(
            "mt-0.5 w-4 h-4 rounded-[3px] border flex-shrink-0 flex items-center justify-center transition-colors",
            selected
              ? "bg-amber-500 border-amber-500"
              : "border-[#374151] bg-transparent hover:border-amber-500/60",
          )}
          aria-label={selected ? "Deselect" : "Select"}
        >
          {selected && <Check size={10} strokeWidth={3} className="text-black" />}
        </button>

        {/* Platform badge */}
        <div
          className="w-7 h-7 rounded-[4px] flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold text-white"
          style={{ backgroundColor: platformConfig.color }}
          title={platformConfig.label}
        >
          {platformConfig.lettermark}
        </div>

        {/* Content preview + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-muted font-mono truncate">
              {item.automation_name}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                statusConfig.bgColor,
                statusConfig.color,
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  statusConfig.dotColor,
                  statusConfig.pulse && "animate-pulse",
                )}
              />
              {statusConfig.label}
            </span>
          </div>

          <p className="text-sm text-text-primary line-clamp-3 leading-relaxed">
            {item.content}
          </p>

          {item.metadata?.subject && (
            <p className="mt-1 text-xs text-text-secondary">
              Subject: {item.metadata.subject}
            </p>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-text-muted font-mono">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onReview(item)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary border border-[#1E2330] hover:border-[#374151] px-2.5 py-1 rounded-[4px] transition-colors min-h-[48px] sm:min-h-0"
          >
            <Eye size={12} />
            Review
          </button>

          {isPendingReview && (
            <>
              <button
                type="button"
                onClick={() => onQuickReject(item)}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-2.5 py-1 rounded-[4px] transition-colors min-h-[48px] sm:min-h-0"
              >
                <X size={12} />
                Reject
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-400/30 hover:border-emerald-400/60 px-2.5 py-1 rounded-[4px] transition-colors disabled:opacity-50 min-h-[48px] sm:min-h-0"
              >
                <Check size={12} />
                Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
