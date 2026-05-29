"use client";

import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search, Ban, CheckCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { useAdminUsers, useSuspendUser, useUnsuspendUser } from "@/hooks/useAdmin";
import { formatNumber } from "@/lib/analytics/dateRange";
import type { AdminUser, UserPlan, UserStatus } from "@/lib/api/admin";

const PAGE_SIZE = 20;

const PLAN_PILL: Record<UserPlan, string> = {
  free: "bg-[#374151]/50 text-[#9CA3AF]",
  pro: "bg-cyan-500/15 text-cyan-400",
  team: "bg-violet-500/15 text-violet-400",
  admin: "bg-amber-500/20 text-amber-400",
};

const STATUS_DOT: Record<UserStatus, { dot: string; text: string }> = {
  active: { dot: "bg-emerald-400", text: "text-emerald-400" },
  suspended: { dot: "bg-red-500", text: "text-red-400" },
  pending: { dot: "bg-amber-400", text: "text-amber-400" },
};

function PlanBadge({ plan }: { plan: UserPlan }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm px-1.5 py-0.5 text-2xs font-mono capitalize", PLAN_PILL[plan])}>
      {plan}
    </span>
  );
}

function StatusIndicator({ status }: { status: UserStatus }) {
  const c = STATUS_DOT[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-2xs font-mono capitalize", c.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {status}
    </span>
  );
}

function SuspendPanel({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const suspendMutation = useSuspendUser();

  return (
    <tr className="bg-[#0A0B0F]">
      <td colSpan={7} className="border-b border-border px-6 py-3">
        <div className="max-w-sm space-y-2">
          <p className="text-xs font-mono text-text-secondary">
            Suspend <span className="text-amber">{user.email}</span>?
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason…"
            rows={2}
            className="input-command w-full resize-none rounded-[6px] p-2 text-xs"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                suspendMutation.mutate(
                  { id: user.id, reason: reason || undefined },
                  {
                    onSuccess: () => { toast.success(`${user.name || user.email} suspended`); onClose(); },
                    onError: () => toast.error("Failed to suspend user"),
                  },
                )
              }
              disabled={suspendMutation.isPending}
              className="flex items-center gap-1.5 rounded-[6px] bg-red-500/15 px-3 py-1.5 text-xs font-mono text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
            >
              <Ban className="h-3 w-3" />
              {suspendMutation.isPending ? "Suspending…" : "Confirm Suspend"}
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-mono text-text-muted transition-colors hover:text-text-primary"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function UnsuspendPanel({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const unsuspendMutation = useUnsuspendUser();

  return (
    <tr className="bg-[#0A0B0F]">
      <td colSpan={7} className="border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <p className="text-xs font-mono text-text-secondary">
            Unsuspend <span className="text-amber">{user.email}</span>?
          </p>
          <button
            onClick={() =>
              unsuspendMutation.mutate(user.id, {
                onSuccess: () => { toast.success(`${user.name || user.email} unsuspended`); onClose(); },
                onError: () => toast.error("Failed to unsuspend user"),
              })
            }
            disabled={unsuspendMutation.isPending}
            className="flex items-center gap-1.5 rounded-[6px] bg-emerald-500/15 px-3 py-1.5 text-xs font-mono text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
          >
            <CheckCircle className="h-3 w-3" />
            {unsuspendMutation.isPending ? "Unsuspending…" : "Confirm Unsuspend"}
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-mono text-text-muted transition-colors hover:text-text-primary"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

type PanelMode = "suspend" | "unsuspend";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<UserPlan | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [offset, setOffset] = useState(0);
  const [panel, setPanel] = useState<{ id: string; mode: PanelMode } | null>(null);

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

  const { data, isLoading } = useAdminUsers({
    search: debouncedSearch || undefined,
    plan: planFilter,
    status: statusFilter,
    limit: PAGE_SIZE,
    offset,
  });

  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  const openPanel = (id: string, mode: PanelMode) => {
    setPanel((prev) => (prev?.id === id && prev.mode === mode ? null : { id, mode }));
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage all platform users"
        breadcrumb={[{ label: "Admin" }, { label: "Users" }]}
      />

      <div className="space-y-4 p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search users…"
              className="h-8 w-52 pl-8 text-xs"
            />
          </div>

          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value as UserPlan | "all");
              setOffset(0);
            }}
            className="input-command h-8 rounded-[6px] text-xs"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="team">Team</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as UserStatus | "all");
              setOffset(0);
            }}
            className="input-command h-8 rounded-[6px] text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Table */}
        <div className="card-command overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                    User
                  </th>
                  <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-2.5 px-4 text-right text-2xs font-mono text-text-muted uppercase tracking-wider">
                    Tokens (30d)
                  </th>
                  <th className="py-2.5 px-4 text-right text-2xs font-mono text-text-muted uppercase tracking-wider">
                    Automations
                  </th>
                  <th className="py-2.5 px-4 text-left text-2xs font-mono text-text-muted uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="py-2.5 px-4 text-center text-2xs font-mono text-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-2xs font-mono text-text-muted">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && data?.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-2xs font-mono text-text-muted">
                      No users found
                    </td>
                  </tr>
                )}
                {data?.items.map((user) => (
                  <Fragment key={user.id}>
                    <tr className="border-b border-border transition-colors hover:bg-bg-overlay">
                      <td className="py-2.5 px-4">
                        <p className="text-text-primary">{user.name || "—"}</p>
                        <p className="text-2xs font-mono text-text-muted">{user.email}</p>
                        <p className="text-2xs font-mono text-amber/70">{user.workspace_name}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <PlanBadge plan={user.plan} />
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusIndicator status={user.status} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-text-secondary">
                        {formatNumber(user.token_usage_30d)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-text-secondary">
                        {user.automation_count}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-text-muted">
                        {user.last_active_at
                          ? formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true })
                          : "Never"}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center">
                          {user.status === "suspended" ? (
                            <button
                              onClick={() => openPanel(user.id, "unsuspend")}
                              title="Unsuspend"
                              className={cn(
                                "rounded-[4px] p-1.5 text-2xs font-mono transition-colors",
                                panel?.id === user.id && panel.mode === "unsuspend"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "text-text-muted hover:bg-emerald-500/10 hover:text-emerald-400",
                              )}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => openPanel(user.id, "suspend")}
                              title="Suspend"
                              className={cn(
                                "rounded-[4px] p-1.5 text-2xs font-mono transition-colors",
                                panel?.id === user.id && panel.mode === "suspend"
                                  ? "bg-red-500/20 text-red-400"
                                  : "text-text-muted hover:bg-red-500/10 hover:text-red-400",
                              )}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {panel?.id === user.id && panel.mode === "suspend" && (
                      <SuspendPanel user={user} onClose={() => setPanel(null)} />
                    )}
                    {panel?.id === user.id && panel.mode === "unsuspend" && (
                      <UnsuspendPanel user={user} onClose={() => setPanel(null)} />
                    )}
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
    </>
  );
}
