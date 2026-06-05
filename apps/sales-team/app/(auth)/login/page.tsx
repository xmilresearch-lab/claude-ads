import AuthForm from '@/components/auth/AuthForm'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
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
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm">Sign in to your strategy board</p>
        </div>

        <AuthForm mode="login" error={error ?? null} callbackUrl={callbackUrl ?? null} />

        <p className="text-center text-gray-600 text-xs mt-6">
          No account?{' '}
          <Link href="/signup" className="text-orange-400 hover:text-orange-300 transition-colors">
            Sign up free — 3 analyses included
          </Link>
        </p>
      </div>
    </main>
  )
}
