import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { analysisResultSchema, type AnalysisResult } from '@/lib/schemas'
import FrameworkCard from '@/components/analysis/FrameworkCard'
import Link from 'next/link'
import type { Metadata } from 'next'

const EXPERT_COLORS: Record<string, string> = {
  Hormozi: '#4F46E5',
  GaryVee: '#9333EA',
  Cardone: '#DC2626',
  Belfort: '#D97706',
  Kennedy: '#0891B2',
  Brunson: '#059669',
  Godin:   '#DB2777',
  Robbins: '#EA580C',
}

interface Props {
  params: Promise<{ shareToken: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params
  const analysis = await prisma.analysis.findUnique({
    where: { shareToken, shared: true },
    select: { result: true, analysisType: true },
  })

  if (!analysis) return { title: 'Analysis Not Found' }

  const parsed = analysisResultSchema.safeParse(analysis.result)
  const summary = parsed.success ? parsed.data.synthesis.executiveSummary : ''
  const description = summary.slice(0, 160)
  const title = 'See what 8 expert frameworks revealed about this offer'
  const ogImageUrl = `${process.env.NEXTAUTH_URL ?? ''}/api/og/${shareToken}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export default async function SharePage({ params }: Props) {
  const { shareToken } = await params

  // Only serve analyses the owner has made public
  const analysis = await prisma.analysis.findUnique({
    where: { shareToken, shared: true },
    select: {
      offerText: true,
      analysisType: true,
      result: true,
      createdAt: true,
    },
  })

  if (!analysis) notFound()

  const parsed = analysisResultSchema.safeParse(analysis.result)
  if (!parsed.success) notFound()

  const { frameworks, synthesis } = parsed.data as AnalysisResult

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-900 px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">$</span>
          </div>
          <span className="text-white font-semibold text-sm">100M Sales Team</span>
        </Link>
        <Link
          href="/signup"
          className="text-sm bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Try Free →
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Type + date */}
        <div>
          <span className="text-xs font-medium text-orange-400 capitalize bg-orange-950/60 px-2 py-0.5 rounded-full">
            {analysis.analysisType}
          </span>
          <p className="text-xs text-gray-600 mt-2">
            Analyzed{' '}
            {new Date(analysis.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Synthesis */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Integrated Strategy
          </h2>
          <p className="text-white text-sm leading-relaxed">{synthesis.overview}</p>

          {synthesis.immediateActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Top Immediate Actions
              </p>
              <ol className="space-y-1.5">
                {synthesis.immediateActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-orange-500 font-mono font-bold shrink-0">{i + 1}.</span>
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {synthesis.executiveSummary && (
            <div className="border-l-4 border-orange-600 pl-4">
              <p className="text-sm text-gray-300 italic leading-relaxed">
                {synthesis.executiveSummary}
              </p>
            </div>
          )}
        </div>

        {/* Framework cards */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Expert Framework Breakdown
          </h3>
          <div className="space-y-2">
            {frameworks.map((framework) => (
              <FrameworkCard
                key={framework.name}
                name={framework.name}
                focus={framework.focus}
                insight={framework.insight}
                improvements={framework.improvements}
                metric={framework.metric}
                color={EXPERT_COLORS[framework.name] ?? '#6B7280'}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-orange-950/60 to-gray-900 border border-orange-800/40 rounded-xl p-6 text-center">
          <h3 className="text-lg font-bold text-white mb-2">
            Analyze your own offer free — takes 90 seconds
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            3 free analyses · No credit card required · 8 expert frameworks
          </p>
          <Link
            href="/signup"
            className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Analyze My Offer Free →
          </Link>
        </div>

        {/* Footer */}
        <footer className="pt-4 border-t border-gray-900 text-center">
          <p className="text-xs text-gray-600">
            Generated by{' '}
            <Link href="/" className="text-gray-500 hover:text-gray-400 transition-colors">
              $100M AI Sales Team
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
