'use client'

import { useSubscription, useUsage } from '@/hooks/useBilling'
import { useCreateCheckout } from '@/hooks/useBilling'
import { PLAN_LABELS } from '@/lib/api/billing'
import { cn } from '@/lib/utils/cn'

interface BarProps {
  label: string
  used: number
  limit: number | null
  color?: 'amber' | 'cyan'
}

function Bar({ label, used, limit, color = 'amber' }: BarProps) {
  if (limit === null) return null

  const pct = Math.min((used / limit) * 100, 100)
  const warn = pct >= 80
  const over = pct >= 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-sans text-text-muted">{label}</span>
        <span
          className={cn(
            'text-xs font-mono',
            over ? 'text-red-400' : warn ? 'text-amber' : 'text-text-secondary',
          )}
        >
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div
        className={cn(
          'h-1 rounded-full bg-bg-overlay overflow-hidden',
          over && 'border border-red-500/40',
          warn && !over && 'border border-amber/30',
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

export function UsageBar() {
  const { data: usage } = useUsage()
  const { data: sub } = useSubscription()
  const checkout = useCreateCheckout()

  if (!usage || !sub) return null
  if (sub.plan === 'pro' || sub.plan === 'enterprise') return null

  const atLimit =
    (usage.automations_limit !== null && usage.automations_used >= usage.automations_limit) ||
    (usage.tokens_limit !== null && usage.tokens_used >= usage.tokens_limit)

  return (
    <div
      className={cn(
        'mx-3 mb-3 p-3 rounded-lg border bg-bg-surface space-y-3',
        atLimit ? 'border-amber' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-display text-text-secondary uppercase tracking-wider">
          {PLAN_LABELS[sub.plan]} plan
        </span>
        {atLimit && (
          <span className="text-[10px] font-mono text-amber uppercase tracking-widest">
            Limit reached
          </span>
        )}
      </div>

      <Bar
        label="Automations"
        used={usage.automations_used}
        limit={usage.automations_limit}
        color="amber"
      />
      <Bar
        label="AI Tokens"
        used={usage.tokens_used}
        limit={usage.tokens_limit}
        color="cyan"
      />

      {atLimit && (
        <button
          onClick={() =>
            checkout.mutate({
              priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? '',
              successUrl: `${window.location.origin}/billing/success`,
              cancelUrl: `${window.location.origin}/settings`,
            })
          }
          disabled={checkout.isPending}
          className="w-full py-1.5 rounded-lg bg-amber text-bg-base
            text-xs font-sans font-medium uppercase tracking-wider
            hover:bg-amber/90 transition-colors disabled:opacity-50"
        >
          {checkout.isPending ? 'Redirecting...' : 'Upgrade to Pro'}
        </button>
      )}
    </div>
  )
}
