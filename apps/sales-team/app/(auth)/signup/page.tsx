import AuthForm from '@/components/auth/AuthForm'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}

export default async function SignupPage({ searchParams }: Props) {
  const { error, callbackUrl } = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">$</span>
            </div>
            <span className="text-white font-semibold text-sm">100M AI Sales Team</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Analyze your first offer free</h1>
          <p className="text-gray-500 text-sm">3 free analyses. No credit card required.</p>
        </div>

        <AuthForm mode="signup" error={error ?? null} callbackUrl={callbackUrl ?? null} />

        <p className="text-center text-gray-600 text-xs mt-4">
          Already have an account? The same link signs you in.
        </p>

        <p className="text-center text-gray-700 text-xs mt-3">
          <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
            Go to sign in →
          </Link>
        </p>
      </div>
    </main>
  )
}
