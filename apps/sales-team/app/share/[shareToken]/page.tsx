import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { analysisResultSchema, type AnalysisResult } from '@/lib/schemas'
import FrameworkCard from '@/components/analysis/FrameworkCard'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ shareToken: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params
  const analysis = await prisma.analysis.findUnique({
    where: { shareToken },
    select: { offerText: true, analysisType: true },
  })

  if (!analysis) return { title: 'Analysis Not Found' }

  const title = `${analysis.analysisType.charAt(0).toUpperCase() + analysis.analysisType.slice(1)} Analysis — $100M Sales Team`
  const description = analysis.offerText.slice(0, 160)
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

  const analysis = await prisma.analysis.findUnique({
    where: { shareToken },
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
        <Link href="/" className="text-white font-bold text-base">
          $100M Sales Team
        </Link>
        <Link
          href="/signup"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Try Free
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <span className="text-xs font-medium text-blue-400 capitalize bg-blue-950 px-2 py-0.5 rounded-full">
            {analysis.analysisType}
          </span>
          <p className="text-xs text-gray-600 mt-2">
            Analyzed {new Date(analysis.createdAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>

        {/* Synthesis */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Integrated Strategy
          </h2>
          <p className="text-white text-sm leading-relaxed mb-4">{synthesis.overview}</p>

          {synthesis.immediateActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Top Immediate Actions
              </p>
              <ol className="space-y-1.5">
                {synthesis.immediateActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 font-mono shrink-0">{i + 1}.</span>
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Framework cards */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Expert Framework Breakdown
          </h3>
          <div className="space-y-2">
            {frameworks.map((framework, i) => (
              <FrameworkCard key={framework.name} framework={framework} index={i} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-950 to-gray-900 border border-blue-800/50 rounded-xl p-6 text-center">
          <h3 className="text-lg font-bold text-white mb-2">
            Analyze your own offer in 90 seconds
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            3 free analyses. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Analyze My Offer Free
          </Link>
        </div>
      </main>
    </div>
  )
}
