import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-900">
        <h1 className="text-white font-bold text-lg">$100M AI Sales Team</h1>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="text-gray-400 hover:text-white text-sm transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Get 3 free analyses
          </Link>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
        <h2 className="text-5xl md:text-6xl font-bold text-white max-w-3xl leading-tight mb-6">
          Your offer analyzed by 8 elite strategists — in 90 seconds
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mb-10">
          Hormozi, GaryVee, Cardone, Belfort, Kennedy, Brunson, Godin, and Robbins
          synthesize one integrated strategy for your exact offer.
        </p>
        <Link
          href="/signup"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-colors"
        >
          Analyze My Offer Free
        </Link>
        <p className="text-gray-600 text-sm mt-4">3 free analyses. No credit card required.</p>
      </section>

      <footer className="px-6 py-4 border-t border-gray-900 text-center">
        <Link href="/pricing" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
          Pricing
        </Link>
      </footer>
    </main>
  )
}
