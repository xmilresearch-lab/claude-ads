import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getRatelimiter } from '@/lib/ratelimit'
import { assistantSchema } from '@/lib/schemas'
import { writeAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { getAnthropic, MODEL, ASSISTANT_SYSTEM_PROMPT } from '@/lib/ai'

export async function POST(req: NextRequest) {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Rate limit
  const limiter = getRatelimiter(session.user.tier)
  const { success } = await limiter.limit(`assistant:${session.user.id}`)
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Step 3: Zod validation
  const body: unknown = await req.json()
  const parsed = assistantSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { message, conversationHistory } = parsed.data
  const userId = session.user.id

  try {
    // Last 5 analyses for context
    const recentAnalyses = await prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { offerText: true, analysisType: true, createdAt: true },
    })

    const analysisHistory = recentAnalyses
      .map((a, i) => `${i + 1}. [${a.analysisType}] ${a.offerText.slice(0, 100)}...`)
      .join('\n')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = getAnthropic().messages.stream({
            model: MODEL,
            max_tokens: 512,
            system: ASSISTANT_SYSTEM_PROMPT.replace('{HISTORY_PLACEHOLDER}', analysisHistory),
            messages: [
              ...conversationHistory,
              { role: 'user', content: message },
            ],
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

          await writeAuditLog({ userId, action: 'ASSISTANT_QUERY', metadata: {} })
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (error) {
          console.error('[assistant] stream error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Assistant unavailable' })}\n\n`)
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
  } catch (error) {
    console.error('[assistant] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
