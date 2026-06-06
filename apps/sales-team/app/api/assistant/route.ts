import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { auth } from '@/lib/auth'
import { getRatelimiter } from '@/lib/ratelimit'
import { assistantSchema } from '@/lib/schemas'
import { writeAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import { getAnthropic, MODEL } from '@/lib/ai'
import { sanitizeInput, validateOutput, AISecurityError } from '@/lib/aiSecurity'
import { buildHardenedAssistantPrompt } from '@/lib/promptHardening'

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

  // Step 3.5: Input security guard
  let sanitizedMessage: string
  try {
    const { sanitized, threats } = sanitizeInput(message)
    sanitizedMessage = sanitized
    if (threats.length > 0) {
      await writeAuditLog({
        userId,
        action: 'INPUT_THREAT_DETECTED',
        metadata: { threats, inputLength: message.length },
      })
    }
  } catch (error) {
    if (error instanceof AISecurityError) {
      await writeAuditLog({
        userId,
        action: 'SECURITY_EVENT',
        metadata: {
          threatType: error.threatType,
          inputHash: createHash('sha256').update(message).digest('hex'),
          inputLength: message.length,
        },
      })
      return Response.json(
        {
          error: 'content_policy_violation',
          message:
            'Your input could not be processed. Please describe your question directly.',
        },
        { status: 400 }
      )
    }
    throw error
  }

  try {
    // IDOR guard: history query always scoped to session.user.id — never from request body
    const recentAnalyses = await prisma.analysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { offerText: true, analysisType: true, createdAt: true },
    })

    const analysisHistory = recentAnalyses
      .map((a, i) => `${i + 1}. [${a.analysisType}] ${a.offerText.slice(0, 100)}...`)
      .join('\n')

    const hardenedSystemPrompt = buildHardenedAssistantPrompt(analysisHistory)
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = getAnthropic().messages.stream({
            model: MODEL,
            max_tokens: 512,
            system: hardenedSystemPrompt,
            messages: [
              ...conversationHistory,
              { role: 'user', content: sanitizedMessage },
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

          const finalMessage = await anthropicStream.finalMessage()
          const rawText = finalMessage.content
            .map(b => (b.type === 'text' ? b.text : ''))
            .join('')

          // Output validation — assistant is lenient: only SCRIPT_INJECTION is hard-blocked
          const { violations } = validateOutput(rawText, 'assistant')
          if (violations.length > 0) {
            await writeAuditLog({
              userId,
              action: 'OUTPUT_THREAT_DETECTED',
              metadata: { violations },
            }).catch(() => {})
          }

          await writeAuditLog({ userId, action: 'ASSISTANT_QUERY', metadata: {} })
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (error) {
          if (error instanceof AISecurityError) {
            await writeAuditLog({
              userId,
              action: 'SECURITY_EVENT',
              metadata: { threatType: error.threatType },
            }).catch(() => {})
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  error: 'content_policy_violation',
                  message: 'Response could not be delivered.',
                })}\n\n`
              )
            )
          } else {
            console.error('[assistant] stream error:', error)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Assistant unavailable' })}\n\n`)
            )
          }
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
