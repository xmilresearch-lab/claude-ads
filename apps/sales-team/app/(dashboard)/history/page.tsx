import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ShareCard from '@/components/analysis/ShareCard'
import { type AnalysisResult } from '@/lib/schemas'

interface AnalysisRow {
  id: string
  offerText: string
  analysisType: string
  shareToken: string
  createdAt: Date
  result: unknown
}

function getExecutiveSummary(result: unknown): string {
  try {
    const r = result as AnalysisResult
    return r?.synthesis?.executiveSummary ?? ''
  } catch {
    return ''
  }
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { q } = await searchParams
  const userId = session.user.id

  const analyses: AnalysisRow[] = await prisma.analysis.findMany({
    where: {
      userId,
      ...(q ? { offerText: { contains: q, mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      offerText: true,
      analysisType: true,
      shareToken: true,
      createdAt: true,
      result: true,
    },
  })

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Analysis History</h1>
        <Link
          href="/dashboard/analyze"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          New Analysis
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search your analyses..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </form>

      {analyses.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm mb-3">
            {q ? `No analyses matching "${q}"` : 'Run your first analysis — it takes 90 seconds'}
          </p>
          <Link
            href="/dashboard/analyze"
            className="text-blue-400 hover:underline text-sm"
          >
            Analyze My Offer
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => {
            const summary = getExecutiveSummary(analysis.result)
            return (
              <div
                key={analysis.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-blue-400 capitalize bg-blue-950 px-2 py-0.5 rounded-full">
                        {analysis.analysisType}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2">{analysis.offerText}</p>
                    {summary && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-1 italic">{summary}</p>
                    )}
                  </div>
                  <ShareCard shareToken={analysis.shareToken} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
