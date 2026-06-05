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

  // Step 2: FREE tier hard cap — checked before rate limiter to give clearer UX
  if (
    session.user.tier === 'FREE' &&
    session.user.analysisCount >= TIER_LIMITS.FREE.analysesPerDay
  ) {
    return Response.json(
      {
        error: 'limit_reached',
        upgradeUrl: '/pricing',
        analysisCount: session.user.analysisCount,
      },
      { status: 402 }
    )
  }

  // Step 3: Rate limit (sliding window per tier)
  const limiter = getRatelimiter(session.user.tier)
  const { success } = await limiter.limit(`analyze:${session.user.id}`)
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Step 4: Zod validation
  const body: unknown = await req.json()
  const parsed = analyzeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { offerText, analysisType } = parsed.data
  const userId = session.user.id

  // Step 5: Stream Anthropic response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = getAnthropic().messages.stream({
          model: MODEL,
          max_tokens: 4000,
          system: ANALYSIS_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `${analysisType.toUpperCase()}: ${offerText}` }],
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            )
          }
        }

        // Step 7: Parse, save, and audit after stream completes
        const finalMessage = await anthropicStream.finalMessage()
        const fullText = finalMessage.content
          .map(b => (b.type === 'text' ? b.text : ''))
          .join('')

        const result = JSON.parse(fullText) as Prisma.InputJsonValue
        const analysis = await prisma.analysis.create({
          data: { userId, offerText, analysisType, result },
        })

        await prisma.user.update({
          where: { id: userId },
          data: { analysisCount: { increment: 1 } },
        })

        await writeAuditLog({
          userId,
          action: 'ANALYSIS_CREATED',
          metadata: {
            analysisId: analysis.id,
            analysisType,
            offerTextLength: offerText.length,
          },
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

  // Step 6: Return SSE stream
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
