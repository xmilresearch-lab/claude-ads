import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { SecurityScanResult } from '@prisma/client'

type AnomalySignal = { type: string; value: number; threshold: number }
type SecurityEventMeta = { threatType?: string; inputLength?: number }
type AnomalyMeta = { signals?: AnomalySignal[]; ipAddress?: string }

// ─── Scanner status badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pass: 'bg-green-950 text-green-400 border-green-800',
    warn: 'bg-yellow-950 text-yellow-400 border-yellow-800',
    fail: 'bg-red-950 text-red-400 border-red-800',
  }
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${styles[status] ?? styles['warn']}`}>
      {status.toUpperCase()}
    </span>
  )
}

// ─── CSS-only timeline dot ─────────────────────────────────────────────────────
function TimelineDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pass: 'bg-green-500',
    warn: 'bg-yellow-500',
    fail: 'bg-red-500',
  }
  return (
    <span
      title={status}
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${colors[status] ?? 'bg-gray-500'}`}
    />
  )
}

function asMeta<T>(raw: unknown): T {
  return (raw ?? {}) as T
}

// ─── Bar chart row ─────────────────────────────────────────────────────────────
function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-48 text-gray-400 truncate font-mono text-xs">{label}</span>
      <div className="flex-1 bg-gray-800 rounded h-5 overflow-hidden">
        <div
          className="h-full bg-orange-600 rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-white font-semibold">{count}</span>
    </div>
  )
}

// ─── Signal chips ──────────────────────────────────────────────────────────────
function SignalChip({ signal }: { signal: AnomalySignal }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800">
      {signal.type}
      <span className="text-orange-300">
        {signal.value}/{signal.threshold}
      </span>
    </span>
  )
}

export default async function AdminSecurityPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  if (!adminEmails.includes(session.user.email ?? '')) redirect('/analyze')

  const now = new Date()
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [actionCounts, securityEvents, anomalyEvents, todayAnalyses, scanResults] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since24h } },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
    }),
    prisma.auditLog.findMany({
      where: { action: 'SECURITY_EVENT', createdAt: { gte: since24h } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { userId: true, metadata: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { action: 'ANOMALY_DETECTED', createdAt: { gte: since24h } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { userId: true, metadata: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { action: 'ANALYSIS_CREATED', createdAt: { gte: todayStart } },
      select: { userId: true },
    }),
    prisma.securityScanResult.findMany({
      where: { createdAt: { gte: since30d } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  // Most recent scan per type
  const latestByType: Record<string, SecurityScanResult> = {}
  for (const r of scanResults) {
    if (!latestByType[r.scanType]) latestByType[r.scanType] = r
  }

  // Top 10 users by analyses today
  const analysisCountByUser: Record<string, number> = {}
  for (const log of todayAnalyses) {
    analysisCountByUser[log.userId] = (analysisCountByUser[log.userId] ?? 0) + 1
  }
  const topUsers = Object.entries(analysisCountByUser)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const maxActionCount = Math.max(...actionCounts.map(a => a._count.action), 1)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10 text-white">
      <div>
        <h1 className="text-2xl font-bold">Security Monitor</h1>
        <p className="text-gray-400 text-sm mt-1">Last 24 hours — auto-refreshes on page load</p>
      </div>

      {/* Section 1: Event counts bar chart */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Events by Action (24h)</h2>
        <div className="bg-gray-900 rounded-xl p-5 space-y-2.5">
          {actionCounts.length === 0 ? (
            <p className="text-gray-500 text-sm">No events in the last 24 hours.</p>
          ) : (
            actionCounts.map(a => (
              <BarRow
                key={a.action}
                label={a.action}
                count={a._count.action}
                max={maxActionCount}
              />
            ))
          )}
        </div>
      </section>

      {/* Section 2: Security events table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          SECURITY_EVENT log <span className="text-gray-500 font-normal text-sm">(last 50)</span>
        </h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-800">
                <th className="text-left p-3">Time (UTC)</th>
                <th className="text-left p-3">User (last 8)</th>
                <th className="text-left p-3">Threat Type</th>
                <th className="text-right p-3">Input Len</th>
              </tr>
            </thead>
            <tbody>
              {securityEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-gray-500 text-center">No security events.</td>
                </tr>
              ) : (
                securityEvents.map((e, i) => {
                  const meta = asMeta<SecurityEventMeta>(e.metadata)
                  return (
                    <tr key={i} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                      <td className="p-3 font-mono text-xs text-gray-400">
                        {e.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="p-3 font-mono text-xs text-gray-300">
                        …{e.userId.slice(-8)}
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                          {meta.threatType ?? '—'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-400 font-mono text-xs">
                        {meta.inputLength ?? '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Anomaly events table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          ANOMALY_DETECTED log <span className="text-gray-500 font-normal text-sm">(last 20)</span>
        </h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-800">
                <th className="text-left p-3">Time (UTC)</th>
                <th className="text-left p-3">User (last 8)</th>
                <th className="text-left p-3">Signals</th>
              </tr>
            </thead>
            <tbody>
              {anomalyEvents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-3 text-gray-500 text-center">No anomaly events.</td>
                </tr>
              ) : (
                anomalyEvents.map((e, i) => {
                  const meta = asMeta<AnomalyMeta>(e.metadata)
                  return (
                    <tr key={i} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                      <td className="p-3 font-mono text-xs text-gray-400">
                        {e.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="p-3 font-mono text-xs text-gray-300">
                        …{e.userId.slice(-8)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(meta.signals ?? []).map((s, j) => (
                            <SignalChip key={j} signal={s} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Top users by analyses today */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Top Users by Analyses Today
          <span className="text-gray-500 font-normal text-sm ml-2">
            {todayStart.toISOString().slice(0, 10)} UTC
          </span>
        </h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-800">
                <th className="text-left p-3">Rank</th>
                <th className="text-left p-3">User (last 8)</th>
                <th className="text-right p-3">Analyses</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-3 text-gray-500 text-center">No analyses today.</td>
                </tr>
              ) : (
                topUsers.map(([uid, count], i) => (
                  <tr key={uid} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                    <td className="p-3 text-gray-500 text-xs">#{i + 1}</td>
                    <td className="p-3 font-mono text-xs text-gray-300">…{uid.slice(-8)}</td>
                    <td className="p-3 text-right font-semibold">{count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5: Scanner Results */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Security Scanner Results{' '}
          <span className="text-gray-500 font-normal text-sm">(last 30 days)</span>
        </h2>

        {/* Summary row — most recent per scan type */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['static', 'adversarial', 'garak', 'zap'] as const).map((type) => {
            const latest = latestByType[type]
            return (
              <div key={type} className="bg-gray-900 rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-400 font-mono uppercase">{type}</p>
                {latest ? (
                  <>
                    <StatusBadge status={latest.status} />
                    <p className="text-[10px] text-gray-500 mt-1">
                      {latest.createdAt.toISOString().slice(0, 10)}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {latest.criticalCount > 0 && (
                        <span className="text-red-400">{latest.criticalCount} crit </span>
                      )}
                      {latest.warnCount > 0 && (
                        <span className="text-yellow-400">{latest.warnCount} warn</span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-gray-600">No runs yet</p>
                )}
              </div>
            )
          })}
        </div>

        {/* 30-day timeline — CSS-only dot chart */}
        {scanResults.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-3">Timeline (newest → oldest)</p>
            <div className="flex flex-wrap gap-1.5">
              {scanResults.map((r) => (
                <TimelineDot key={r.id} status={r.status} />
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-[10px] text-gray-500">
              <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />pass</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />warn</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />fail</span>
            </div>
          </div>
        )}

        {/* Last 20 scans table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-800">
                <th className="text-left p-3">Date (UTC)</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Crit</th>
                <th className="text-right p-3">Warn</th>
                <th className="text-left p-3">Trigger</th>
                <th className="text-left p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {scanResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-3 text-gray-500 text-center text-sm">
                    No scans in the last 30 days. Run{' '}
                    <code className="font-mono text-xs text-gray-400">npm run scan:all</code>{' '}
                    to populate.
                  </td>
                </tr>
              ) : (
                scanResults.map((r) => (
                  <tr key={r.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                    <td className="p-3 font-mono text-xs text-gray-400">
                      {r.createdAt.toISOString().replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="p-3 font-mono text-xs text-gray-300">{r.scanType}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3 text-right font-mono text-xs">
                      {r.criticalCount > 0 ? (
                        <span className="text-red-400 font-semibold">{r.criticalCount}</span>
                      ) : (
                        <span className="text-gray-600">0</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-xs">
                      {r.warnCount > 0 ? (
                        <span className="text-yellow-400">{r.warnCount}</span>
                      ) : (
                        <span className="text-gray-600">0</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500">{r.triggeredBy}</td>
                    <td className="p-3">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-400 hover:text-white select-none">
                          View
                        </summary>
                        <pre className="mt-2 text-[10px] text-gray-400 bg-gray-950 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                          {JSON.stringify(r.findings, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Manual run instructions */}
        <div className="bg-gray-900 rounded-xl p-5 text-sm space-y-2">
          <p className="font-semibold text-gray-300">Run Manual Scan</p>
          <p className="text-gray-500 text-xs">
            From the project root (requires venv to be set up via{' '}
            <code className="font-mono">npm run scan:setup</code>):
          </p>
          <pre className="text-xs font-mono text-gray-300 bg-gray-950 rounded p-3 overflow-x-auto">
{`# Full scan (static + adversarial + prompt audit):
npm run scan:all

# Upload results to this dashboard:
SCANNER_SECRET=<secret> APP_URL=http://localhost:3000 npm run scan:all

# Static only:
npm run scan:static

# Adversarial only:
npm run scan:adversarial`}
          </pre>
        </div>
      </section>
    </div>
  )
}
