/**
 * GET /api/cron/weekly-digest
 * Vercel Cron — runs every Monday at 09:00 UTC.
 * schedule: "0 9 * * 1" (vercel.json)
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { render } from '@react-email/render'
import { writeAuditLog } from '@/lib/audit'
import WeeklyDigestEmail, { getSubject } from '@/emails/weekly-digest'
import type { AnalysisResult } from '@/lib/schemas'

const BATCH_SIZE = 50
const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

function extractSummary(result: unknown): string {
  try {
    const r = result as AnalysisResult
    return r?.synthesis?.executiveSummary ?? ''
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  // Validate Vercel Cron authorization
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Fetch all opted-in users with their recent analyses
  const users = await prisma.user.findMany({
    where: { marketingOptOut: false },
    select: {
      id: true,
      email: true,
      name: true,
      tier: true,
      analysisCount: true,
      unsubscribeToken: true,
      analyses: {
        where: { createdAt: { gte: oneWeekAgo } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { result: true, createdAt: true },
      },
    },
  })

  let sentCount = 0
  let errorCount = 0

  // Process in batches of BATCH_SIZE to respect Resend rate limits
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)

    await Promise.allSettled(
      batch.map(async (user) => {
        try {
          const weeklyAnalysisCount = user.analyses.length
          const topInsight = user.analyses[0] ? extractSummary(user.analyses[0].result) : ''
          const isFreeAtLimit = user.tier === 'FREE' && user.analysisCount >= 3

          const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${user.unsubscribeToken}`
          const analysisUrl = `${BASE_URL}/dashboard/analyze`
          const upgradeUrl = `${BASE_URL}/pricing`

          const html = await render(
            WeeklyDigestEmail({
              ...(user.name ? { name: user.name } : {}),
              analysisCount: weeklyAnalysisCount,
              topInsight,
              analysisUrl,
              upgradeUrl,
              unsubscribeUrl,
              isFreeAtLimit,
            })
          )

          await sendEmail({
            to: user.email,
            subject: getSubject(weeklyAnalysisCount),
            html,
          })

          sentCount++
        } catch (err) {
          console.error(`[weekly-digest] failed for ${user.id}:`, err)
          errorCount++
        }
      })
    )

    // Small delay between batches to stay within rate limits
    if (i + BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // Write a single audit log for the whole run
  // Use a system user ID placeholder since this is a cron job
  const firstUser = users[0]
  if (firstUser) {
    await writeAuditLog({
      userId: firstUser.id,
      action: 'WEEKLY_DIGEST_SENT',
      metadata: { recipientCount: sentCount, errorCount, totalEligible: users.length },
    })
  }

  console.log(`[weekly-digest] sent=${sentCount} errors=${errorCount} total=${users.length}`)
  return Response.json({ ok: true, sentCount, errorCount })
}
