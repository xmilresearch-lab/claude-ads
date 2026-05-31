'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { api } from '@/lib/api/client'

const schema = z.object({ email: z.string().email('Enter a valid email') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const form = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setSubmitted(true)
    } catch {
      toast.error('Something went wrong — please try again')
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center space-y-4">
        <h1 className="font-display text-2xl text-text-primary">Check your email</h1>
        <p className="font-sans text-text-secondary text-sm max-w-xs">
          If that address is registered, a reset link is on its way.
        </p>
        <Link href="/login" className="text-sm font-sans text-amber hover:underline">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl text-text-primary">Reset password</h1>
          <p className="font-sans text-sm text-text-secondary">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-sans text-text-secondary">Email</label>
            <input
              {...form.register('email')}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2.5
                text-sm font-sans text-text-primary placeholder:text-text-muted
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber
                focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
            />
            {form.formState.errors.email && (
              <p className="text-xs font-sans text-red-400">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full py-2.5 rounded-lg bg-amber text-bg-base text-sm font-sans font-medium
              hover:bg-amber/90 transition-colors disabled:opacity-50"
          >
            {form.formState.isSubmitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p className="text-center text-sm font-sans text-text-muted">
          <Link href="/login" className="text-amber hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
