import Link from 'next/link'
import { BarChart2, Zap, Target, CheckCircle } from 'lucide-react'

const FRAMEWORKS = [
  { name: 'Hormozi', focus: 'Value Stack & Offer Design', color: 'text-orange-400' },
  { name: 'GaryVee', focus: 'Content & Distribution', color: 'text-blue-400' },
  { name: 'Cardone', focus: '10X Sales Mindset', color: 'text-green-400' },
  { name: 'Belfort', focus: 'Certainty & Persuasion', color: 'text-purple-400' },
  { name: 'Kennedy', focus: 'Direct Response Copy', color: 'text-yellow-400' },
  { name: 'Brunson', focus: 'Funnel Architecture', color: 'text-pink-400' },
  { name: 'Godin', focus: 'Remarkability & Spread', color: 'text-cyan-400' },
  { name: 'Robbins', focus: 'Standards & Identity', color: 'text-red-400' },
]

const STEPS = [
  {
    icon: BarChart2,
    number: '01',
    title: 'Describe your offer',
    body: 'Paste your sales copy, describe your product, or explain your business challenge. 10 words or 500 — the AI adapts.',
  },
  {
    icon: Zap,
    number: '02',
    title: '8 frameworks analyze it',
    body: 'Hormozi, Belfort, Kennedy, and 5 more experts each apply their signature methodology to your exact words.',
  },
  {
    icon: Target,
    number: '03',
    title: 'Get your integrated plan',
    body: 'One synthesized strategy with immediate actions, framework insights, and the specific metrics that matter for your offer.',
  },
]

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    description: '',
    cta: 'Start Free',
    href: '/signup',
    highlight: false,
    features: ['3 analyses/day', '8 expert frameworks', 'Shareable results'],
  },
  {
    name: 'Pro',
    price: '$149',
    description: '/mo',
    cta: 'Start Pro',
    href: '/signup',
    highlight: true,
    features: ['Unlimited analyses', 'AI coaching assistant', 'PDF export', 'API access (500 calls/mo)'],
  },
  {
    name: 'Agency',
    price: '$497',
    description: '/mo',
    cta: 'Start Agency',
    href: '/signup',
    highlight: false,
    features: ['Everything in Pro', 'Team seats', 'White-label reports', 'API access (5,000 calls/mo)'],
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-600 rounded-md flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">$</span>
            </div>
            <span className="text-white font-semibold text-sm">100M Sales Team</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-400 hover:text-white text-sm transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-6">
          AI Strategy Board
        </p>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
          In 90 Seconds, Know Exactly Why Your Offer Isn&rsquo;t Converting&nbsp;— And What to Do About It
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          8 elite business frameworks. One integrated strategy. Zero consultants required.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg px-8 py-4 rounded-xl transition-colors w-full sm:w-auto text-center"
          >
            Analyze My Offer Free →
          </Link>
          <p className="text-gray-600 text-sm">3 free analyses. No credit card required.</p>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="bg-gray-900 border-y border-gray-800 py-5">
        <p className="text-center text-gray-500 text-sm">
          Trusted by founders running <span className="text-gray-300 font-medium">$100K–$10M</span> businesses
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest text-center mb-3">
          How it works
        </p>
        <h2 className="text-3xl font-bold text-center mb-12">From offer to strategy in 90 seconds</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map(({ icon: Icon, number, title, body }) => (
            <div key={number}>
              <div className="text-5xl font-black text-gray-800 mb-3 leading-none">{number}</div>
              <Icon className="w-6 h-6 text-orange-400 mb-3" />
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Framework grid */}
      <section className="bg-gray-900 border-y border-gray-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest text-center mb-3">
            The frameworks
          </p>
          <h2 className="text-3xl font-bold text-center mb-4">8 experts. One integrated strategy.</h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-12 text-sm">
            Each framework applies its signature methodology to your offer simultaneously.
            The synthesis finds what all 8 agree on — and where they conflict.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FRAMEWORKS.map(({ name, focus, color }) => (
              <div key={name} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className={`text-lg font-bold mb-1 ${color}`}>{name}</p>
                <p className="text-gray-500 text-xs leading-snug">{focus}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10">
          <CheckCircle className="w-10 h-10 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">The Blind Spot Guarantee</h2>
          <p className="text-gray-400 leading-relaxed">
            Find a blind spot in your sales strategy in the first 10 minutes, or your first month is on us.
            If the 8 frameworks don&rsquo;t surface something actionable in your offer,
            email us and we&rsquo;ll refund the first month. No questions asked.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest text-center mb-3">
          Pricing
        </p>
        <h2 className="text-3xl font-bold text-center mb-12">Start free. Upgrade when you&rsquo;re convinced.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING.map(({ name, price, description, cta, href, highlight, features }) => (
            <div
              key={name}
              className={`rounded-2xl border p-7 flex flex-col ${
                highlight
                  ? 'bg-orange-950/40 border-orange-500'
                  : 'bg-gray-900 border-gray-800'
              }`}
            >
              {highlight && (
                <span className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3">
                  Most popular
                </span>
              )}
              <p className="text-lg font-bold mb-1">{name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-black">{price}</span>
                {description && <span className="text-gray-500 text-sm pb-1">{description}</span>}
              </div>
              <ul className="space-y-2.5 mt-5 mb-7 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className={`block text-center font-bold py-3 rounded-xl text-sm transition-colors ${
                  highlight
                    ? 'bg-orange-600 hover:bg-orange-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-600 text-sm mt-6">
          <Link href="/pricing" className="hover:text-gray-400 transition-colors">
            View full pricing & feature comparison →
          </Link>
        </p>
      </section>

      {/* Final CTA */}
      <section className="bg-orange-950/30 border-t border-orange-900/50 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
            In 90 Seconds, Know Exactly Why Your Offer Isn&rsquo;t Converting&nbsp;— And What to Do About It
          </h2>
          <Link
            href="/signup"
            className="inline-block bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors"
          >
            Start Free — No Credit Card Required
          </Link>
          <p className="text-gray-600 text-sm mt-4">
            3 free analyses. Takes 2 minutes to set up.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-700 text-xs">© 2024 $100M AI Sales Team</p>
          <div className="flex gap-4">
            <Link href="/pricing" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Pricing</Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Sign in</Link>
            <Link href="/signup" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Get started</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
