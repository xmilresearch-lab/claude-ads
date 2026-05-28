"use client";

import { useState } from "react";
import { Play, Pencil, Trash2, ChevronDown, Clock, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useToggleAutomation,
  useDeleteAutomation,
  useTriggerAutomation,
  useRunHistory,
} from "@/lib/hooks/use-automations";
import { CreateAutomationDialog } from "@/components/automations/create-automation-dialog";
import { format } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { AutomationResponse, AutomationRunResponse, AutomationType, RunStatus } from "@/lib/api/types";

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AutomationType, string> = {
  social_post:    "Social Post",
  email_campaign: "Email Campaign",
  support_reply:  "Support Reply",
  crm_update:     "CRM Update",
  scheduled:      "Scheduled",
};

const TYPE_VARIANT: Record<AutomationType, "info" | "default" | "secondary" | "warning"> = {
  social_post:    "info",
  email_campaign: "default",
  support_reply:  "secondary",
  crm_update:     "secondary",
  scheduled:      "warning",
};

const RUN_STATUS_VARIANT: Record<RunStatus, "success" | "danger" | "warning" | "secondary" | "info"> = {
  success: "success",
  failed:  "danger",
  blocked: "danger",
  running: "info",
  pending: "warning",
};

// ── Run history row ───────────────────────────────────────────────────────────

function RunRow({ run }: { run: AutomationRunResponse }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <Badge variant={RUN_STATUS_VARIANT[run.status]} className="text-2xs">
          {run.status}
        </Badge>
        <span className="font-mono text-2xs text-text-muted">
          {format.datetime(run.started_at)}
        </span>
      </div>
      <div className="flex items-center gap-3 text-2xs font-mono text-text-muted">
        {run.ai_tokens_used != null && (
          <span>{format.tokens(run.ai_tokens_used)}</span>
        )}
        {run.finished_at && (
          <span className="text-text-muted">
            {Math.round(
              (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000,
            )}s
          </span>
        )}
        {run.error && (
          <span className="text-danger max-w-[160px] truncate" title={run.error}>
            {run.error}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const { mutate, isPending } = useToggleAutomation();
  return (
    <button
      onClick={() => mutate({ id, active: !active })}
      disabled={isPending}
      className={cn(
        "relative inline-flex h-5 w-9 cursor-pointer rounded-full border transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
        active ? "bg-amber border-amber" : "bg-bg-elevated border-border",
        isPending && "opacity-50 pointer-events-none",
      )}
      aria-label={active ? "Pause automation" : "Activate automation"}
    >
      <span className={cn(
        "absolute top-0.5 h-4 w-4 rounded-full bg-bg-base transition-transform duration-150",
        active ? "translate-x-4" : "translate-x-0.5",
      )} />
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface Props {
  automation: AutomationResponse;
}

export function AutomationCard({ automation }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showRuns, setShowRuns] = useState(false);

  const { mutate: deleteAuto, isPending: isDeleting } = useDeleteAutomation();
  const { mutate: trigger, isPending: isTriggering } = useTriggerAutomation();
  const { data: runs, isFetching: runsLoading } = useRunHistory(automation.id, showRuns);

  return (
    <>
      <div className="card-command flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <Badge variant={TYPE_VARIANT[automation.type]}>
              {TYPE_LABELS[automation.type]}
            </Badge>
            <Badge variant={automation.active ? "success" : "secondary"}>
              {automation.active ? "Active" : "Paused"}
            </Badge>
          </div>
          <ActiveToggle id={automation.id} active={automation.active} />
        </div>

        {/* Name + meta */}
        <div className="px-4 pb-3">
          <h3 className="font-display text-sm font-semibold text-text-primary leading-snug">
            {automation.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-2xs text-text-muted">
            {automation.schedule ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{automation.schedule}</span>
              </span>
            ) : (
              <span className="text-text-muted">No schedule</span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format.date(automation.created_at)}
            </span>
          </div>
          <p className="mt-1 font-mono text-2xs text-text-muted">{automation.id}</p>
        </div>

        {/* Actions */}
        <div className="mt-auto border-t border-border px-4 py-2.5 flex items-center gap-1 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isTriggering}
            onClick={() => trigger(automation.id)}
          >
            <Play className="h-3 w-3" />
            Run
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 px-2 text-xs", showRuns && "text-amber")}
            onClick={() => setShowRuns((v) => !v)}
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform duration-150", showRuns && "rotate-180")} />
            History
          </Button>

          <div className="ml-auto">
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-2xs text-danger mr-1">Delete?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-2xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-6 px-2 text-2xs"
                  disabled={isDeleting}
                  onClick={() => deleteAuto(automation.id)}
                >
                  {isDeleting ? "…" : "Delete"}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-text-muted hover:text-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Run history */}
        {showRuns && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-2xs font-mono text-text-muted uppercase tracking-widest">
              Recent runs
            </p>
            {runsLoading ? (
              <div className="space-y-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-bg-elevated" />
                ))}
              </div>
            ) : !runs || runs.length === 0 ? (
              <p className="text-xs text-text-muted">No runs yet.</p>
            ) : (
              <div>
                {runs.map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateAutomationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={automation}
      />
    </>
  );
}
