'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { api } from '@/lib/api/client'

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
type FormData = z.infer<typeof schema>

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const form = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      await api.post('/auth/reset-password', { token, new_password: data.password })
      toast.success('Password updated — please log in')
      router.push('/login')
    } catch {
      toast.error('Reset link is invalid or expired')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="font-display text-2xl text-text-primary">Set new password</h1>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {(['password', 'confirm'] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-sm font-sans text-text-secondary capitalize">
                {field === 'confirm' ? 'Confirm password' : 'New password'}
              </label>
              <input
                {...form.register(field)}
                type="password"
                className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2.5
                  text-sm font-sans text-text-primary
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber
                  focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
              />
              {form.formState.errors[field] && (
                <p className="text-xs font-sans text-red-400">
                  {form.formState.errors[field]?.message}
                </p>
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full py-2.5 rounded-lg bg-amber text-bg-base text-sm font-sans font-medium
              hover:bg-amber/90 transition-colors disabled:opacity-50"
          >
            {form.formState.isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
