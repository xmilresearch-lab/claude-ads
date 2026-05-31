'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { billingKeys } from '@/hooks/useBilling'

export default function BillingSuccessPage() {
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: billingKeys.subscription })
    queryClient.invalidateQueries({ queryKey: billingKeys.usage })
  }, [queryClient])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-6">
      <div className="w-16 h-16 rounded-full bg-amber/10 border border-amber/30 flex items-center justify-center">
        <span className="text-amber text-2xl font-mono">&#10003;</span>
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-2xl text-text-primary">Welcome to your new plan!</h1>
        <p className="font-sans text-text-secondary text-sm max-w-sm">
          Your subscription is active. Your limits have been updated — go automate something.
        </p>
      </div>
      <Link
        href="/automations"
        className="px-6 py-2.5 rounded-lg bg-amber text-bg-base text-sm font-sans font-medium
          hover:bg-amber/90 transition-colors"
      >
        Go to Automations
      </Link>
    </div>
  )
}
