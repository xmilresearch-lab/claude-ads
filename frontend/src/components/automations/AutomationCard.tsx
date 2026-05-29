"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Clock, Activity, BarChart2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cronToHuman } from "@/lib/cron";
import { PLATFORM_CONFIGS } from "@/lib/automations/platforms";
import { useToggleAutomation, useTriggerAutomation } from "@/hooks/useAutomations";
import type { Automation } from "@/lib/api/automations";
import { cn } from "@/lib/utils/cn";

interface AutomationCardProps {
  automation: Automation;
  onEdit: (automation: Automation) => void;
  onDelete: (id: string) => void;
  onRunTriggered: (automationId: string) => void;
}

export function AutomationCard({ automation, onEdit, onDelete, onRunTriggered }: AutomationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [triggerCooldown, setTriggerCooldown] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMutation = useToggleAutomation();
  const triggerMutation = useTriggerAutomation();

  const platformConfig = PLATFORM_CONFIGS[automation.platform];

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleTrigger = () => {
    if (triggerCooldown || triggerMutation.isPending) return;
    setTriggerCooldown(true);
    triggerMutation.mutate(automation.id, {
      onSuccess: () => onRunTriggered(automation.id),
    });
    setTimeout(() => setTriggerCooldown(false), 2000);
  };

  const handleToggle = () => {
    if (toggleMutation.isPending) return;
    toggleMutation.mutate(automation.id);
  };

  const isRunDisabled = triggerCooldown || triggerMutation.isPending;

  return (
    <div className="bg-[#0D0E14] border border-[#1E2330] rounded-[6px] p-4">
      {/* Top row */}
      <div className="flex justify-between items-start gap-3">
        {/* Left: badge + name + description */}
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[3px]",
              platformConfig.color,
              platformConfig.bgColor,
            )}
          >
            {platformConfig.label}
          </span>
          <p className="font-display font-semibold text-sm text-white mt-1 leading-snug">
            {automation.name}
          </p>
          {automation.description && (
            <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">
              {automation.description}
            </p>
          )}
        </div>

        {/* Right: status pill + menu */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono">
            {automation.status === "active" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Active</span>
              </>
            )}
            {automation.status === "paused" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
                <span className="text-[#6B7280]">Paused</span>
              </>
            )}
            {automation.status === "draft" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-amber-400">Draft</span>
              </>
            )}
          </span>

          {/* Three-dot menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded text-[#6B7280] hover:text-white hover:bg-[#1E2330] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-[#0D0E14] border border-[#1E2330] rounded-[6px] shadow-xl z-10 min-w-[120px]">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(automation); }}
                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#1E2330] cursor-pointer transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(automation.id); }}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle row: meta */}
      <div className="mt-3 flex items-center gap-4 text-xs font-mono text-[#6B7280] flex-wrap">
        <span className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {cronToHuman(automation.cron_expression)}
        </span>
        {automation.last_run_at && (
          <span className="flex items-center">
            <Activity className="w-3 h-3 mr-1" />
            Last run {formatDistanceToNow(new Date(automation.last_run_at))} ago
          </span>
        )}
        {automation.run_count > 0 && (
          <span className="flex items-center">
            <BarChart2 className="w-3 h-3 mr-1" />
            {automation.run_count} runs
          </span>
        )}
      </div>

      {/* Bottom row: toggle + run now */}
      <div className="mt-3 pt-3 border-t border-[#1A1D2B] flex items-center justify-between">
        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          disabled={toggleMutation.isPending}
          aria-label={automation.status === "active" ? "Pause automation" : "Activate automation"}
          className={cn(
            "relative w-8 h-4 rounded-full transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
            automation.status === "active" ? "bg-amber-500" : "bg-[#374151]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-150",
              automation.status === "active" ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>

        {/* Run now */}
        <button
          onClick={handleTrigger}
          disabled={isRunDisabled}
          className="bg-[#0D0E14] border border-[#1E2330] hover:border-amber-500/50 text-xs text-white px-3 py-1.5 rounded-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          {isRunDisabled ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Running…
            </>
          ) : (
            "Run Now"
          )}
        </button>
      </div>
    </div>
  );
}
