"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
}

const MAX_REASON = 200;

export function RejectModal({
  open,
  onClose,
  onConfirm,
  isPending = false,
  reason,
  onReasonChange,
}: RejectModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const remaining = MAX_REASON - reason.length;
  const isOverLimit = remaining < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-[#111318] border border-[#1E2330] rounded-[6px] shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base text-text-primary">Reject Content</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Reason textarea */}
        <div className="mb-5">
          <label className="block text-xs text-text-secondary mb-2">
            Reason{" "}
            <span className="text-text-muted">(optional)</span>
          </label>
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Describe why this content is being rejected…"
            rows={3}
            className={cn(
              "w-full input-command resize-none rounded-[4px] p-3 text-sm",
              isOverLimit && "border-red-500 focus:border-red-500",
            )}
          />
          <div className="flex justify-end mt-1">
            <span
              className={cn(
                "text-xs font-mono",
                isOverLimit ? "text-red-400" : remaining < 30 ? "text-amber-400" : "text-text-muted",
              )}
            >
              {remaining}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-sm text-text-secondary hover:text-text-primary border border-[#1E2330] hover:border-[#374151] px-4 py-2 rounded-[4px] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isPending || isOverLimit}
            className="text-sm text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 hover:border-red-400/60 px-4 py-2 rounded-[4px] transition-colors disabled:opacity-50"
          >
            {isPending ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
