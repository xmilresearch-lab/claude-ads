"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { CONTENT_STATUS_CONFIG, CONTENT_PLATFORM_CONFIG } from "@/lib/content/config";
import { getCharCountState } from "@/lib/content/limits";
import { useEditContent, useApproveContent, useRejectContent } from "@/hooks/useContent";
import { RejectModal } from "./RejectModal";
import type { ContentItem } from "@/lib/api/content";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

interface ReviewModalProps {
  item: ContentItem | null;
  open: boolean;
  onClose: () => void;
}

type SaveState = "idle" | "saving" | "saved";

export function ReviewModal({ item, open, onClose }: ReviewModalProps) {
  const [lastSeenItemId, setLastSeenItemId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editMutation = useEditContent();
  const approveMutation = useApproveContent();
  const rejectMutation = useRejectContent();

  // Sync text when item changes (setState-during-render pattern — no effect needed)
  if (item && item.id !== lastSeenItemId) {
    setLastSeenItemId(item.id);
    setText(item.content);
    setSaveState("idle");
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !rejectOpen) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, rejectOpen]);

  const triggerAutoSave = useCallback(
    (value: string) => {
      if (!item || value === item.content) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSaveState("saving");
        editMutation.mutate(
          { id: item.id, content: value },
          {
            onSuccess: () => {
              setSaveState("saved");
              if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
              savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
            },
            onError: () => {
              setSaveState("idle");
              toast.error("Failed to save changes");
            },
          },
        );
      }, 800);
    },
    [item, editMutation],
  );

  const handleBlur = () => triggerAutoSave(text);

  const handleApprove = () => {
    if (!item) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const doApprove = (id: string) => {
      approveMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Content approved");
          onClose();
        },
        onError: () => toast.error("Failed to approve content"),
      });
    };
    // If there are unsaved changes, save first then approve
    if (text !== item.content) {
      setSaveState("saving");
      editMutation.mutate(
        { id: item.id, content: text },
        {
          onSuccess: () => doApprove(item.id),
          onError: () => {
            setSaveState("idle");
            toast.error("Failed to save changes");
          },
        },
      );
    } else {
      doApprove(item.id);
    }
  };

  const handleRejectConfirm = (reason: string) => {
    if (!item) return;
    rejectMutation.mutate(
      { id: item.id, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success("Content rejected");
          setRejectOpen(false);
          onClose();
        },
        onError: () => toast.error("Failed to reject content"),
      },
    );
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  if (!open || !item) return null;

  const charState = getCharCountState(text, item.platform);
  const statusConfig = CONTENT_STATUS_CONFIG[item.status];
  const platformConfig = CONTENT_PLATFORM_CONFIG[item.platform];
  const isPendingReview = item.status === "pending_review";
  const isActionPending = approveMutation.isPending || editMutation.isPending;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-[#111318] border border-[#1E2330] rounded-[6px] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2330] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-[4px] flex items-center justify-center font-mono text-xs font-bold text-white"
                style={{ backgroundColor: platformConfig.color }}
              >
                {platformConfig.lettermark}
              </div>
              <div>
                <h2 className="font-display text-base text-text-primary leading-tight">
                  {platformConfig.label}
                </h2>
                <p className="text-xs text-text-muted font-mono">{item.automation_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Save state indicator */}
              {saveState === "saving" && (
                <span className="text-xs text-text-muted animate-pulse">Saving…</span>
              )}
              {saveState === "saved" && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check size={12} />
                  Saved
                </span>
              )}
              {/* Status */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full",
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
              <button
                type="button"
                onClick={onClose}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Content editor */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              {/* Email subject */}
              {item.metadata?.subject && (
                <div className="mb-4">
                  <label className="block text-xs text-text-secondary mb-1.5">Subject</label>
                  <p className="text-sm text-text-primary bg-[#0D0E14] border border-[#1E2330] rounded-[4px] px-3 py-2">
                    {item.metadata.subject}
                  </p>
                </div>
              )}

              <label className="block text-xs text-text-secondary mb-1.5">Content</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleBlur}
                rows={10}
                className={cn(
                  "w-full input-command resize-none rounded-[4px] p-3 text-sm flex-1",
                  charState.severity === "danger" && "border-red-500 focus:border-red-500",
                  charState.severity === "warning" && "border-amber-500/60",
                )}
              />

              {/* Char counter */}
              {charState.limit !== null && (
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    {charState.isOverLimit && (
                      <AlertCircle size={12} className="text-red-400" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-mono",
                        charState.severity === "danger"
                          ? "text-red-400"
                          : charState.severity === "warning"
                            ? "text-amber-400"
                            : "text-text-muted",
                      )}
                    >
                      {charState.isOverLimit
                        ? `${Math.abs(charState.remaining!)} over limit`
                        : `${charState.remaining} remaining`}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-text-muted">
                    {charState.count} / {charState.limit}
                  </span>
                </div>
              )}
            </div>

            {/* Metadata sidebar */}
            <div className="w-56 flex-shrink-0 border-l border-[#1E2330] p-5 overflow-y-auto">
              <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-4">
                Details
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-text-muted mb-0.5">Created</dt>
                  <dd className="text-xs text-text-secondary font-mono">
                    {format(new Date(item.created_at), "MMM d, yyyy")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted mb-0.5">Age</dt>
                  <dd className="text-xs text-text-secondary font-mono">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </dd>
                </div>
                {item.metadata?.scheduled_for && (
                  <div>
                    <dt className="text-xs text-text-muted mb-0.5">Scheduled</dt>
                    <dd className="text-xs text-text-secondary font-mono">
                      {format(new Date(item.metadata.scheduled_for), "MMM d, p")}
                    </dd>
                  </div>
                )}
                {item.metadata?.recipient && (
                  <div>
                    <dt className="text-xs text-text-muted mb-0.5">Recipient</dt>
                    <dd className="text-xs text-text-secondary font-mono truncate">
                      {item.metadata.recipient}
                    </dd>
                  </div>
                )}
                {item.tokens_used != null && (
                  <div>
                    <dt className="text-xs text-text-muted mb-0.5">Tokens</dt>
                    <dd className="text-xs text-[#06B6D4] font-mono">
                      {item.tokens_used.toLocaleString()}
                    </dd>
                  </div>
                )}
                {item.metadata?.hashtags && item.metadata.hashtags.length > 0 && (
                  <div>
                    <dt className="text-xs text-text-muted mb-1">Hashtags</dt>
                    <dd className="flex flex-wrap gap-1">
                      {item.metadata.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-[#1E2330] text-text-secondary px-1.5 py-0.5 rounded-[3px] font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {item.rejection_reason && (
                  <div>
                    <dt className="text-xs text-text-muted mb-0.5">Rejection reason</dt>
                    <dd className="text-xs text-red-400">{item.rejection_reason}</dd>
                  </div>
                )}
                {item.publish_error && (
                  <div>
                    <dt className="text-xs text-text-muted mb-0.5">Publish error</dt>
                    <dd className="text-xs text-red-400">{item.publish_error}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Footer */}
          {isPendingReview && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1E2330] flex-shrink-0">
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                disabled={isActionPending}
                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 hover:border-red-400/60 px-4 py-2 rounded-[4px] transition-colors disabled:opacity-50"
              >
                <X size={14} />
                Reject
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isActionPending || charState.isOverLimit}
                className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 hover:border-emerald-400/60 px-4 py-2 rounded-[4px] transition-colors disabled:opacity-50"
              >
                <Check size={14} />
                {isActionPending ? "Saving…" : "Approve"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reject sub-modal */}
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleRejectConfirm}
        isPending={rejectMutation.isPending}
        reason={rejectReason}
        onReasonChange={setRejectReason}
      />
    </>
  );
}
