"use client";

import { Fragment, useState, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { useAuditLog, useExportAuditLog } from "@/hooks/useAuditLog";
import type { AuditAction, AuditLogEntry } from "@/lib/api/auditLog";

const PAGE_SIZE = 25;

const ACTION_GROUPS = {
  Auth: ["user.login", "user.logout", "user.register", "user.password_changed"],
  Automations: [
    "automation.created",
    "automation.updated",
    "automation.deleted",
    "automation.triggered",
    "automation.toggled",
  ],
  Content: ["content.approved", "content.rejected", "content.published"],
  Integrations: ["integration.connected", "integration.disconnected"],
  Workspace: ["workspace.updated", "brand_voice.updated", "api_key.rotated", "webhook.received"],
} as const;

const ACTION_PILL: Record<string, string> = {
  Auth: "bg-violet-500/15 text-violet-400",
  Automations: "bg-cyan-500/15 text-cyan-400",
  Content: "bg-emerald-500/15 text-emerald-400",
  Integrations: "bg-amber-500/15 text-amber-400",
  Workspace: "bg-[#374151]/50 text-[#9CA3AF]",
};

function getCategory(action: AuditAction): string {
  for (const [cat, actions] of Object.entries(ACTION_GROUPS)) {
    if ((actions as readonly string[]).includes(action)) return cat;
  }
  return "Workspace";
}

function ActionPill({ action }: { action: AuditAction }) {
  const cat = getCategory(action);
  return (
    <span className={cn("inline-flex items-center rounded-sm px-1.5 py-0.5 text-2xs font-mono", ACTION_PILL[cat])}>
      {action}
    </span>
  );
}

function StatusDot({ status }: { status: "success" | "failure" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-2xs font-mono capitalize",
        status === "success" ? "text-emerald-400" : "text-red-400",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "success" ? "bg-emerald-400" : "bg-red-400",
        )}
      />
      {status}
    </span>
  );
}

function ExpandedMetaRow({ entry, colSpan }: { entry: AuditLogEntry; colSpan: number }) {
  return (
    <tr className="bg-[#0A0B0F]">
      <td colSpan={colSpan} className="border-b border-border px-6 py-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-2xs font-mono text-text-muted uppercase tracking-wider">Entry ID</p>
            <p className="font-mono text-xs text-amber">{entry.id}</p>
          </div>
          {entry.resource_id && (
            <div className="space-y-1">
              <p className="text-2xs font-mono text-text-muted uppercase tracking-wider">Resource ID</p>
              <p className="font-mono text-xs text-amber">{entry.resource_id}</p>
            </div>
          )}
          {entry.user_agent && (
            <div className="col-span-2 space-y-1">
              <p className="text-2xs font-mono text-text-muted uppercase tracking-wider">User Agent</p>
              <p className="truncate font-mono text-2xs text-text-secondary">{entry.user_agent}</p>
            </div>
          )}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div className="col-span-2 space-y-1">
              <p className="text-2xs font-mono text-text-muted uppercase tracking-wider">Metadata</p>
              <pre className="max-h-28 overflow-auto rounded-[4px] border border-border bg-[#0D0E14] p-2 font-mono text-2xs text-text-secondary">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          )}
          {!entry.resource_id &&
            !entry.user_agent &&
            (!entry.metadata || Object.keys(entry.metadata).length === 0) && (
              <p className="col-span-2 text-2xs font-mono text-text-muted">No additional metadata</p>
            )}
        </div>
      </td>
    </tr>
  );
}

export interface AuditLogTableProps {
  showWorkspaceColumn?: boolean;
}

export function AuditLogTable({ showWorkspaceColumn = false }: AuditLogTableProps) {
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"success" | "failure" | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(val);
      setOffset(0);
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const hasFilters =
    actionFilter !== "all" || statusFilter !== "all" || !!dateFrom || !!dateTo || !!debouncedSearch;

  const clearFilters = () => {
    setActionFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setDebouncedSearch("");
    setOffset(0);
  };

  const params = {
    action: actionFilter,
    status: statusFilter,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset,
  };

  const { data, isLoading } = useAuditLog(params);
  const exportMutation = useExportAuditLog();

  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  const handleExport = () => {
    exportMutation.mutate(
      {
        action: actionFilter,
        status: statusFilter,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: debouncedSearch || undefined,
      },
      { onError: () => toast.error("Export failed") },
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const colSpan = showWorkspaceColumn ? 7 : 6;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value as AuditAction | "all");
            setOffset(0);
          }}
          className="input-command h-8 rounded-[6px] pr-6 text-xs"
        >
          <option value="all">All Actions</option>
          {Object.entries(ACTION_GROUPS).map(([cat, actions]) => (
            <optgroup key={cat} label={cat}>
              {(actions as readonly string[]).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "success" | "failure" | "all");
            setOffset(0);
          }}
          className="input-command h-8 rounded-[6px] pr-6 text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setOffset(0);
          }}
          className="input-command h-8 w-36 rounded-[6px] text-xs"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setOffset(0);
          }}
          className="input-command h-8 w-36 rounded-[6px] text-xs"
        />

        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search user, IP, resource…"
          className="h-8 w-52 text-xs"
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-2xs font-mono text-text-muted transition-colors hover:text-text-primary"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}

        <div className="ml-auto">
          <Button size="sm" variant="secondary" onClick={handleExport} disabled={exportMutation.isPending}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {exportMutation.isPending ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card-command overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                  User
                </th>
                {showWorkspaceColumn && (
                  <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                    Workspace
                  </th>
                )}
                <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                  Action
                </th>
                <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                  Resource
                </th>
                <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-border">
                    {Array.from({ length: showWorkspaceColumn ? 7 : 6 }).map((_, i) => (
                      <td key={i} className="py-3 px-4">
                        <div className="h-4 animate-pulse rounded bg-[#1E2330]" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="py-12 text-center text-2xs font-mono text-text-muted">
                    No audit log entries found
                  </td>
                </tr>
              )}
              {data?.items.map((entry) => (
                <Fragment key={entry.id}>
                  <tr
                    onClick={() => toggleExpand(entry.id)}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-bg-overlay"
                  >
                    <td className="py-2.5 px-4 font-mono text-text-secondary whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {expandedId === entry.id ? (
                          <ChevronUp className="h-3 w-3 shrink-0 text-text-muted" />
                        ) : (
                          <ChevronDown className="h-3 w-3 shrink-0 text-text-muted" />
                        )}
                        {format(new Date(entry.created_at), "MMM d, yyyy HH:mm:ss")}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="text-text-primary">{entry.user_name ?? "System"}</p>
                      {entry.user_email && (
                        <p className="text-2xs font-mono text-text-muted">{entry.user_email}</p>
                      )}
                    </td>
                    {showWorkspaceColumn && (
                      <td className="py-2.5 px-4 font-mono text-xs text-text-muted">
                        {(entry as AuditLogEntry & { workspace_id?: string }).workspace_id ?? "—"}
                      </td>
                    )}
                    <td className="py-2.5 px-4">
                      <ActionPill action={entry.action} />
                    </td>
                    <td className="py-2.5 px-4 font-mono text-text-secondary">
                      {entry.resource_type}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusDot status={entry.status} />
                    </td>
                    <td className="py-2.5 px-4 font-mono text-text-muted">
                      {entry.ip_address ?? "—"}
                    </td>
                  </tr>
                  {expandedId === entry.id && <ExpandedMetaRow entry={entry} colSpan={colSpan} />}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-2xs font-mono text-text-muted">
              Showing {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:text-text-muted"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                className="flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:text-text-muted"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
