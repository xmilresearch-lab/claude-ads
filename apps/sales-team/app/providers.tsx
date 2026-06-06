'use client'

import { SessionProvider } from 'next-auth/react'
import ReferralApplier from '@/components/referral/ReferralApplier'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ReferralApplier />
      {children}
    </SessionProvider>
  )
}
