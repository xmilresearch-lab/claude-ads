'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleResend() {
    setResending(true)
    try {
      await api.post('/auth/resend-verification', {})
      setSent(true)
      toast.success('Verification email sent')
    } catch {
      toast.error('Failed to resend — try again shortly')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-amber/10 border border-amber/30 flex items-center justify-center">
        <span className="text-amber text-2xl">&#9993;</span>
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-2xl text-text-primary">Check your email</h1>
        <p className="font-sans text-text-secondary text-sm max-w-xs">
          We sent you a verification link. Click it to activate your account.
        </p>
      </div>
      {!sent ? (
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm font-sans text-amber hover:underline disabled:opacity-50"
        >
          {resending ? 'Sending...' : "Didn't get it? Resend"}
        </button>
      ) : (
        <p className="text-sm font-sans text-text-muted">Email sent — check your inbox.</p>
      )}
    </div>
  )
}
