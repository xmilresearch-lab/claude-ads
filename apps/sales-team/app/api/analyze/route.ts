import type { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { getRatelimiter, TIER_LIMITS } from '@/lib/ratelimit'
import { analyzeSchema } from '@/lib/schemas'
import { writeAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { getAnthropic, MODEL, ANALYSIS_SYSTEM_PROMPT } from '@/lib/ai'

export async function POST(req: NextRequest) {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Rate limit
  const limiter = getRatelimiter(session.user.tier)
  const { success } = await limiter.limit(`analyze:${session.user.id}`)
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Step 3: Zod validation
  const body: unknown = await req.json()
  const parsed = analyzeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Step 4: FREE tier daily limit check (before Anthropic call)
  if (
    session.user.tier === 'FREE' &&
    session.user.analysisCount >= TIER_LIMITS.FREE.analysesPerDay
  ) {
    return Response.json(
      { error: 'Daily analysis limit reached. Upgrade to continue.' },
      { status: 402 }
    )
  }

  const { offerText, analysisType } = parsed.data
  const userId = session.user.id

  // Step 5: Stream response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullText = ''

        const anthropicStream = getAnthropic().messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: ANALYSIS_SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: `Analyze this ${analysisType}: ${offerText}` },
          ],
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            fullText += chunk.delta.text
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            )
          }
        }

        // Parse, save, increment
        const result = JSON.parse(fullText) as Prisma.InputJsonValue
        const analysis = await prisma.analysis.create({
          data: { userId, offerText, analysisType, result },
        })

        await prisma.user.update({
          where: { id: userId },
          data: { analysisCount: { increment: 1 } },
        })

        // Step 6: Audit log
        await writeAuditLog({
          userId,
          action: 'ANALYSIS_CREATED',
          metadata: { analysisId: analysis.id, analysisType },
        })

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, analysisId: analysis.id, shareToken: analysis.shareToken })}\n\n`
          )
        )
        controller.close()
      } catch (error) {
        console.error('[analyze] stream error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Analysis failed' })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
