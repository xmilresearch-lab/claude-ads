'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import { useSubscription, useUsage } from '@/hooks/useBilling'
import { PLAN_LABELS } from '@/lib/api/billing'
import { cn } from '@/lib/utils/cn'

function UsageRow({
  label,
  used,
  limit,
  color = 'amber',
}: {
  label: string
  used: number
  limit: number | null
  color?: 'amber' | 'cyan'
}) {
  if (limit === null) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-border">
        <span className="font-sans text-sm text-text-secondary">{label}</span>
        <span className="font-mono text-sm text-cyan">{used.toLocaleString()} / Unlimited</span>
      </div>
    )
  }
  const pct = Math.min((used / limit) * 100, 100)
  const warn = pct >= 80
  const over = pct >= 100
  return (
    <div className="py-3 border-b border-border space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-sans text-sm text-text-secondary">{label}</span>
        <span
          className={cn(
            'font-mono text-sm',
            over ? 'text-red-400' : warn ? 'text-amber' : 'text-text-secondary',
          )}
        >
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div
        className={cn(
          'h-1.5 rounded-full bg-bg-overlay overflow-hidden',
          over && 'ring-1 ring-red-500/30',
          warn && !over && 'ring-1 ring-amber/30',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all',
            color === 'cyan' ? 'bg-cyan' : 'bg-amber',
            over && 'bg-red-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function UsagePage() {
  const { data: usage, isLoading } = useUsage()
  const { data: sub } = useSubscription()

  if (isLoading || !usage || !sub) {
    return <div className="p-6 text-text-muted font-mono text-sm animate-pulse">Loading usage...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl text-text-primary">Usage</h1>
          <p className="font-sans text-sm text-text-secondary">
            {PLAN_LABELS[sub.plan]} plan
            {usage.period_reset_date && (
              <> &middot; Resets {format(new Date(usage.period_reset_date), 'MMM d')}</>
            )}
          </p>
        </div>
        <Link
          href="/billing/plans"
          className="px-4 py-2 rounded-lg bg-amber text-bg-base text-sm font-sans font-medium
            hover:bg-amber/90 transition-colors"
        >
          Upgrade
        </Link>
      </div>

      <div className="card-command p-0 overflow-hidden">
        <UsageRow label="Automations" used={usage.automations_used} limit={usage.automations_limit} />
        <UsageRow label="Integrations" used={usage.integrations_used} limit={usage.integrations_limit} />
        <UsageRow label="Content queue" used={usage.content_queue_used} limit={usage.content_queue_limit} />
        <UsageRow label="AI tokens" used={usage.tokens_used} limit={usage.tokens_limit} color="cyan" />
      </div>

      <p className="text-xs font-sans text-text-muted">
        Manage your subscription in the{' '}
        <Link href="/billing/portal" className="text-amber hover:underline">
          billing portal
        </Link>
        .
      </p>
    </div>
  )
}
