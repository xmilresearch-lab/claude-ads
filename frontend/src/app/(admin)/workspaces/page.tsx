"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useAdminWorkspaces } from "@/hooks/useAdmin";
import { formatNumber } from "@/lib/analytics/dateRange";
import type { UserPlan } from "@/lib/api/admin";

const PAGE_SIZE = 20;

const PLAN_PILL: Record<UserPlan, string> = {
  free: "bg-[#374151]/50 text-[#9CA3AF]",
  pro: "bg-cyan-500/15 text-cyan-400",
  team: "bg-violet-500/15 text-violet-400",
  admin: "bg-amber-500/20 text-amber-400",
};

const TABLE_HEADERS = [
  { label: "Workspace", align: "left" },
  { label: "Owner", align: "left" },
  { label: "Plan", align: "left" },
  { label: "Automations", align: "right" },
  { label: "Integrations", align: "right" },
  { label: "Tokens (30d)", align: "right" },
  { label: "Published (30d)", align: "right" },
  { label: "Created", align: "left" },
] as const;

export default function AdminWorkspacesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);

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

  const { data, isLoading } = useAdminWorkspaces({
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <>
      <PageHeader
        title="Workspaces"
        description="All workspaces and their usage metrics"
        breadcrumb={[{ label: "Admin" }, { label: "Workspaces" }]}
        actions={
          <span className="text-xs font-mono text-[#6B7280]">
            {total} workspaces
          </span>
        }
      />

      <div className="space-y-4 p-6">
        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search workspaces…"
              className="h-8 w-56 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Table card */}
        <div className="card-command overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1E2330]">
                  {TABLE_HEADERS.map((h) => (
                    <th
                      key={h.label}
                      className={cn(
                        "py-2.5 px-4 text-2xs font-mono text-[#6B7280] uppercase tracking-wider",
                        h.align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#1E2330]">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 animate-pulse rounded bg-[#1E2330]" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!isLoading && (!data?.items || data.items.length === 0) && (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState title="No workspaces found" />
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  data?.items.map((ws) => (
                    <tr
                      key={ws.id}
                      className="border-b border-[#1E2330] transition-colors hover:bg-[#111318]"
                    >
                      {/* Workspace name */}
                      <td className="py-3 px-4">
                        <span className="font-display text-sm text-white">
                          {ws.name}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-[#9CA3AF]">{ws.owner_name}</p>
                        <p className="text-[10px] font-mono text-[#6B7280]">
                          {ws.owner_email}
                        </p>
                      </td>

                      {/* Plan badge */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-sm px-1.5 py-0.5 text-2xs font-mono capitalize",
                            PLAN_PILL[ws.plan],
                          )}
                        >
                          {ws.plan}
                        </span>
                      </td>

                      {/* Automations */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-xs text-[#9CA3AF]">
                          {ws.automation_count}
                        </span>
                      </td>

                      {/* Integrations */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-xs text-[#9CA3AF]">
                          {ws.integration_count}
                        </span>
                      </td>

                      {/* Tokens 30d */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-xs text-[#06B6D4]">
                          {formatNumber(ws.token_usage_30d)}
                        </span>
                      </td>

                      {/* Published 30d */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono text-xs text-emerald-400">
                          {ws.content_published_30d}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] text-[#6B7280]">
                          {format(new Date(ws.created_at), "MMM yyyy")}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between border-t border-[#1E2330] px-4 py-3">
              <p className="text-2xs font-mono text-[#6B7280]">
                Showing {from}–{to} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="flex items-center gap-1 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="flex items-center gap-1 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
