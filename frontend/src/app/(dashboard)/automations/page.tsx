'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { AutomationCard } from '@/components/automations/AutomationCard'
import { AutomationFormModal } from '@/components/automations/AutomationFormModal'
import { RunDetailModal } from '@/components/automations/RunDetailModal'
import { useAutomations, useDeleteAutomation } from '@/hooks/useAutomations'
import type { Automation } from '@/lib/api/automations'

type FilterTab = 'all' | 'active' | 'paused' | 'draft'
const TABS: FilterTab[] = ['all', 'active', 'paused', 'draft']

export default function AutomationsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Automation | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [runDetailId, setRunDetailId] = useState<string | null>(null)

  const { data: automations, isLoading, isError, refetch } = useAutomations()
  const deleteAutomation = useDeleteAutomation()

  const filtered = useMemo(() => {
    if (!automations) return []
    if (activeFilter === 'all') return automations
    return automations.filter(a => a.status === activeFilter)
  }, [automations, activeFilter])

  const activeCount = automations?.filter(a => a.status === 'active').length ?? 0
  const pausedCount = automations?.filter(a => a.status === 'paused').length ?? 0
  const totalRuns = automations?.reduce((sum, a) => sum + a.run_count, 0) ?? 0

  return (
    <div className="p-6">
      {/* Header row */}
      <div className="flex justify-between items-start mb-6">
        <PageHeader
          title="Automations"
          subtitle="Schedule and trigger your AI workflows"
          className="border-0 p-0"
        />
        <button
          onClick={() => { setEditTarget(null); setFormOpen(true) }}
          className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium px-4 py-2 rounded-[4px] flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          New Automation
        </button>
      </div>

      {/* Stat bar */}
      <div className="flex gap-6 mb-6 font-mono text-sm">
        <span className={activeCount > 0 ? 'text-emerald-400' : 'text-[#6B7280]'}>
          {activeCount} Active
        </span>
        <span className="text-[#6B7280]">{pausedCount} Paused</span>
        <span className={totalRuns > 0 ? 'text-[#06B6D4]' : 'text-[#6B7280]'}>
          {totalRuns} Runs today
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[#1E2330] mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={activeFilter === tab
              ? 'text-xs font-mono text-white px-3 py-1.5 border-b-2 border-amber-500 -mb-px capitalize'
              : 'text-xs font-mono text-[#6B7280] px-3 py-1.5 border-b-2 border-transparent -mb-px capitalize hover:text-white transition-colors'
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-[#1E2330] rounded-[6px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-center py-12">
          <p className="text-sm text-red-400 mb-3">Failed to load automations</p>
          <button
            onClick={() => refetch()}
            className="text-xs text-[#6B7280] hover:text-white border border-[#1E2330] px-3 py-1.5 rounded-[4px] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state (no automations at all) */}
      {!isLoading && !isError && automations?.length === 0 && (
        <EmptyState
          title="No automations yet"
          description="Create your first automation to start scheduling AI workflows"
          action={
            <button
              onClick={() => setFormOpen(true)}
              className="mt-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-medium px-4 py-2 rounded-[4px] transition-colors"
            >
              + New Automation
            </button>
          }
        />
      )}

      {/* Empty state (filter active, no results) */}
      {!isLoading && !isError && automations && automations.length > 0 && filtered.length === 0 && (
        <EmptyState
          title={`No ${activeFilter} automations`}
          description="Change the filter or create a new automation"
        />
      )}

      {/* Grid */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(automation => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onEdit={(a) => { setEditTarget(a); setFormOpen(true) }}
              onDelete={(id) => { if (window.confirm('Delete this automation?')) deleteAutomation.mutate(id) }}
              onRunTriggered={(automationId) => setRunDetailId(automationId)}
            />
          ))}
        </div>
      )}

      <AutomationFormModal
        open={formOpen}
        automation={editTarget ?? undefined}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
      />
      <RunDetailModal
        open={!!runDetailId}
        automationId={runDetailId}
        automationName={automations?.find(a => a.id === runDetailId)?.name}
        onClose={() => setRunDetailId(null)}
      />
    </div>
  )
}
