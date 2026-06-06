import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HistoryList, { type HistoryItem } from '@/components/analysis/HistoryList'
import type { AnalysisResult } from '@/lib/schemas'

function extractSummary(result: unknown): string {
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

  const rows = await prisma.analysis.findMany({
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
      shared: true,
      createdAt: true,
      result: true,
    },
  })

  // Serialize dates — Date objects cannot be passed directly to client components
  const analyses: HistoryItem[] = rows.map((row) => ({
    id: row.id,
    offerText: row.offerText,
    analysisType: row.analysisType,
    shareToken: row.shareToken,
    shared: row.shared,
    createdAt: row.createdAt.toISOString(),
    executiveSummary: extractSummary(row.result),
  }))

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analysis History</h1>
          <p className="text-gray-500 text-sm mt-1">
            {rows.length > 0
              ? `${rows.length} ${rows.length === 1 ? 'analysis' : 'analyses'}`
              : 'No analyses yet'}
          </p>
        </div>
        <Link
          href="/dashboard/analyze"
          className="text-sm bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          New Analysis →
        </Link>
      </div>

      {/* Search — native GET form, fully server-rendered */}
      <form method="GET" className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search your analyses…"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </form>

      <HistoryList analyses={analyses} searchQuery={q ?? ''} />
    </div>
  )
}
