import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import type { AnalysisResult } from '@/lib/schemas'

export default async function PlaybooksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const recentAnalyses = await prisma.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-white">Saved Playbooks</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Curated, framework-specific strategies distilled from your analyses — coming soon.
        </p>
      </div>

      {/* Coming-soon state */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center mb-8">
        <div className="w-12 h-12 bg-orange-950 rounded-xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-orange-500" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Playbooks are coming</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          We&apos;re building a system to extract reusable playbooks from your analyses — tailored
          scripts, objection handlers, and offer structures by framework.
        </p>
      </div>

      {/* Preview: 3 most recent analyses */}
      {recentAnalyses.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Your Recent Analyses (playbook candidates)
          </h3>
          <div className="space-y-3">
            {recentAnalyses.map((analysis) => {
              const summary =
                ((analysis.result as AnalysisResult | null)?.synthesis?.executiveSummary) ?? ''

              return (
                <div
                  key={analysis.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-orange-400 capitalize bg-orange-950/60 px-2 py-0.5 rounded-full">
                          {analysis.analysisType}
                        </span>
                        <span className="text-xs text-gray-600">
                          {analysis.createdAt.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">
                        {analysis.offerText.slice(0, 100)}
                        {analysis.offerText.length > 100 ? '…' : ''}
                      </p>
                      {summary && (
                        <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">{summary}</p>
                      )}
                    </div>
                    <Link
                      href={`/share/${analysis.shareToken}`}
                      target="_blank"
                      className="text-xs text-gray-500 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-800 shrink-0"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {recentAnalyses.length === 0 && (
        <div className="text-center py-8 text-gray-600 text-sm">
          <p className="mb-2">No analyses yet — run your first one to unlock playbook generation.</p>
          <Link href="/dashboard/analyze" className="text-orange-400 hover:underline">
            Analyze My Offer →
          </Link>
        </div>
      )}
    </div>
  )
}
