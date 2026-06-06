'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

// Reads the referredBy cookie (set by /r/[referralCode]) after authentication
// and calls /api/referral/apply once. Cookie is then cleared.
export default function ReferralApplier() {
  const { status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated') return

    const match = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('referredBy='))

    if (!match) return

    const referralCode = match.split('=')[1]?.trim()
    if (!referralCode) return

    // Clear the cookie immediately before the async call
    document.cookie = 'referredBy=; Path=/; Max-Age=0; SameSite=Lax'

    fetch('/api/referral/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode }),
    }).catch(() => {})
  }, [status])

  return null
}
