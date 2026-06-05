'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: 'This email is linked to a different sign-in method. Use the same method you signed up with.',
  EmailSignin: 'The sign-in link expired or was already used. Request a new one.',
  CredentialsSignin: 'Invalid credentials.',
  SessionRequired: 'Sign in to access this page.',
  Default: 'Something went wrong. Please try again.',
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

interface Props {
  mode: 'login' | 'signup'
  error: string | null
  callbackUrl: string | null
}

export default function AuthForm({ mode, error, callbackUrl }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const redirect = callbackUrl ?? '/dashboard/analyze'
  const errorMessage = error !== null ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES['Default']) : null

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await signIn('resend', { email, redirect: false })
    setSent(true)
    setLoading(false)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: redirect })
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
        <p className="text-gray-400 text-sm">
          We sent a link to <span className="text-white font-medium">{email}</span>.
          <br />
          Link expires in <span className="text-orange-400 font-medium">10 minutes</span>.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Use a different email
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Error banner */}
      {errorMessage && (
        <div className="mb-5 px-4 py-3 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-900 font-medium rounded-lg transition-colors text-sm mb-4"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-gray-950 text-gray-600">or continue with email</span>
        </div>
      </div>

      {/* Magic link form */}
      <form onSubmit={handleMagicLink} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          autoComplete="email"
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          {loading ? 'Sending…' : 'Send Magic Link'}
        </button>
      </form>
    </>
  )
}
