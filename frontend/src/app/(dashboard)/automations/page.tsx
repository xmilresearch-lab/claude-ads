"use client";

import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { AutomationCard } from "@/components/automations/automation-card";
import { CreateAutomationDialog } from "@/components/automations/create-automation-dialog";
import { useAutomations } from "@/lib/hooks/use-automations";

function SkeletonCard() {
  return (
    <div className="card-command p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-sm bg-bg-elevated" />
          <div className="h-5 w-14 rounded-sm bg-bg-elevated" />
        </div>
        <div className="h-5 w-9 rounded-full bg-bg-elevated" />
      </div>
      <div className="h-4 w-2/3 rounded bg-bg-elevated" />
      <div className="h-3 w-1/3 rounded bg-bg-elevated" />
      <div className="border-t border-border pt-2 flex gap-2">
        <div className="h-7 w-12 rounded bg-bg-elevated" />
        <div className="h-7 w-12 rounded bg-bg-elevated" />
        <div className="h-7 w-16 rounded bg-bg-elevated" />
      </div>
    </div>
  );
}

export default function AutomationsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: automations, isLoading } = useAutomations();

  const activeCount = automations?.filter((a) => a.active).length ?? 0;
  const total = automations?.length ?? 0;

  return (
    <>
      <PageHeader
        title="Automations"
        description="Define, schedule, and trigger AI-powered automation workflows"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Automation
          </Button>
        }
      />

      <div className="p-6">
        {/* Stats strip */}
        {!isLoading && total > 0 && (
          <div className="mb-5 flex items-center gap-6">
            <div>
              <p className="text-2xs font-mono text-text-muted uppercase tracking-widest">Total</p>
              <p className="font-mono text-lg text-text-primary">{total}</p>
            </div>
            <div>
              <p className="text-2xs font-mono text-text-muted uppercase tracking-widest">Active</p>
              <p className="font-mono text-lg text-amber">{activeCount}</p>
            </div>
            <div>
              <p className="text-2xs font-mono text-text-muted uppercase tracking-widest">Paused</p>
              <p className="font-mono text-lg text-text-secondary">{total - activeCount}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && total === 0 && (
          <div className="card-command">
            <EmptyState
              icon={Zap}
              title="No automations yet"
              description="Create your first automation to start generating AI-powered content and actions."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New Automation
                </Button>
              }
            />
          </div>
        )}

        {/* Grid */}
        {!isLoading && total > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {automations!.map((automation) => (
              <AutomationCard key={automation.id} automation={automation} />
            ))}
          </div>
        )}
      </div>

      <CreateAutomationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
