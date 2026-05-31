'use client'

import { format } from 'date-fns'
import { useSubscription, useUsage } from '@/hooks/useBilling'
import { PLAN_LABELS } from '@/lib/api/billing'

export default function AdminBillingPage() {
  const { data: sub } = useSubscription()
  const { data: usage } = useUsage()

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-xl text-text-primary">Billing &amp; Revenue</h1>
        <p className="font-sans text-sm text-text-secondary">
          Platform-wide billing metrics and Stripe revenue overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-command p-5 space-y-1">
          <p className="text-xs font-sans text-text-muted uppercase tracking-wider">Current Plan</p>
          <p className="font-mono text-2xl text-amber">
            {sub ? PLAN_LABELS[sub.plan] : '—'}
          </p>
          <p className="text-xs font-sans text-text-muted">
            Status: {sub?.subscription_status ?? '—'}
          </p>
        </div>

        <div className="card-command p-5 space-y-1">
          <p className="text-xs font-sans text-text-muted uppercase tracking-wider">Period End</p>
          <p className="font-mono text-lg text-text-primary">
            {sub?.current_period_end
              ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
              : 'N/A'}
          </p>
        </div>

        <div className="card-command p-5 space-y-1">
          <p className="text-xs font-sans text-text-muted uppercase tracking-wider">AI Tokens Used</p>
          <p className="font-mono text-2xl text-cyan">
            {usage ? usage.tokens_used.toLocaleString() : '—'}
          </p>
          <p className="text-xs font-sans text-text-muted">
            Limit: {usage?.tokens_limit?.toLocaleString() ?? 'Unlimited'}
          </p>
        </div>
      </div>

      <div className="card-command p-5 space-y-4">
        <h2 className="font-display text-base text-text-primary">Integration with Stripe</h2>
        <p className="font-sans text-sm text-text-secondary">
          Full MRR dashboard, churn metrics, and signup funnel are available in the{' '}
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber hover:underline"
          >
            Stripe Dashboard
          </a>
          . Admin-level billing endpoints (
          <code className="font-mono text-xs">/api/v1/admin/billing/mrr</code>) are in the
          Phase 8 backlog.
        </p>
      </div>
    </div>
  )
}
